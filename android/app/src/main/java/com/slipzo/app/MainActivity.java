package com.slipzo.app;

import android.app.Dialog;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Message;
import android.view.KeyEvent;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.URLUtil;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.ionicframework.capacitor.Checkout;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Razorpay's own payment screen (official plugin). Plugins have to be registered before the bridge starts.
        registerPlugin(Checkout.class);
        registerPlugin(NativeFileSaverPlugin.class);
        super.onCreate(savedInstanceState);
        enablePaymentWindows();
    }

    /**
     * Razorpay opens the bank (Netbanking), card-authentication and UPI pages in a separate window.
     * An Android WebView silently drops such windows unless the app handles them, which is what made payments
     * end with "Payment could not be completed". Here each of those windows is shown full screen on top of the
     * app and closed again when the page closes it (or when the person presses Back).
     */
    private void enablePaymentWindows() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        WebView web = getBridge().getWebView();

        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

        // Keep everything Capacitor's own client does (file pickers, permissions, ...) and add the window handling
        web.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                return openPaymentWindow(resultMsg);
            }
        });

        web.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            if (url == null) return;
            String lower = url.toLowerCase();
            if (lower.startsWith("http://") || lower.startsWith("https://")) {
                try {
                    String filename = URLUtil.guessFileName(url, contentDisposition, mimeType);
                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                    request.setMimeType(mimeType);
                    String cookies = CookieManager.getInstance().getCookie(url);
                    if (cookies != null) request.addRequestHeader("cookie", cookies);
                    if (userAgent != null) request.addRequestHeader("User-Agent", userAgent);
                    request.setTitle(filename);
                    request.setDescription("Downloading file...");
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                    } else {
                        request.setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, filename);
                    }
                    DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                    if (dm != null) {
                        dm.enqueue(request);
                        Toast.makeText(this, "Downloading " + filename, Toast.LENGTH_SHORT).show();
                    }
                } catch (Exception e) {
                    Toast.makeText(this, "Download failed: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    private boolean openPaymentWindow(Message resultMsg) {
        if (resultMsg == null || !(resultMsg.obj instanceof WebView.WebViewTransport)) return false;

        final WebView popup = new WebView(this);
        WebSettings s = popup.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(popup, true);

        final Dialog dialog = new Dialog(this, android.R.style.Theme_DeviceDefault_Light_NoActionBar);
        dialog.setContentView(popup, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        popup.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
                if (scheme.equals("http") || scheme.equals("https") || scheme.equals("about") || scheme.equals("javascript")) {
                    return false; // normal web pages stay in this window
                }
                // upi://, intent://, bank or wallet apps: hand over to the phone
                try {
                    Intent intent = scheme.equals("intent")
                        ? Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME)
                        : new Intent(Intent.ACTION_VIEW, uri);
                    startActivity(intent);
                } catch (ActivityNotFoundException | java.net.URISyntaxException ignored) {
                    // no app can open it: stay on the page
                }
                return true;
            }
        });

        popup.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onCloseWindow(WebView window) {
                dialog.dismiss();
            }
        });

        dialog.setOnKeyListener((d, keyCode, event) -> {
            if (keyCode == KeyEvent.KEYCODE_BACK && event.getAction() == KeyEvent.ACTION_UP) {
                if (popup.canGoBack()) popup.goBack();
                else dialog.dismiss();
                return true;
            }
            return false;
        });
        dialog.setOnDismissListener(d -> {
            popup.stopLoading();
            popup.destroy();
        });

        WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
        transport.setWebView(popup);
        resultMsg.sendToTarget();
        dialog.show();
        return true;
    }
}
