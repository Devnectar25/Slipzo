package com.slipzo.app;

import android.content.Context;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintJob;
import android.print.PrintManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.Bridge;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Prints a receipt through Android's own print screen (choose printer, copies, paper).
 *
 * An Android WebView ignores window.print(), so in the app the web print code did nothing and the bill was still
 * reported as printed. Here the receipt's HTML is loaded into an off-screen WebView (served through the app's local
 * server so its styles, fonts and images load) and handed to PrintManager.
 *
 * The call resolves when the print screen closes: { printed: true } when a print job was sent, { printed: false,
 * cancelled: true } when the person backed out.
 */
@CapacitorPlugin(name = "NativePrint")
public class NativePrintPlugin extends Plugin {

    // Kept here so the WebView is not collected while the print screen is open
    private WebView printWebView;

    @PluginMethod
    public void print(PluginCall call) {
        final String html = call.getString("html");
        final String jobName = call.getString("jobName", "Slipzen receipt");
        final boolean isA4 = Boolean.TRUE.equals(call.getBoolean("isA4", false));
        final double widthMm = call.getDouble("widthMm", 80.0);
        final double heightMm = call.getDouble("heightMm", 200.0);

        if (html == null || html.trim().isEmpty()) {
            call.reject("Nothing to print");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                startPrint(call, html, jobName, isA4, widthMm, heightMm);
            } catch (Exception e) {
                cleanup();
                call.reject("Could not open the print screen: " + e.getMessage(), e);
            }
        });
    }

    private void startPrint(PluginCall call, String html, String jobName, boolean isA4, double widthMm, double heightMm) {
        cleanup();
        final Bridge bridge = getBridge();
        final WebView web = new WebView(getActivity());
        web.getSettings().setJavaScriptEnabled(false);
        web.getSettings().setLoadsImagesAutomatically(true);
        printWebView = web;

        web.setWebViewClient(new WebViewClient() {
            private boolean started = false;

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                // App files (styles, fonts, images under https://localhost) come from the app itself, like in the main view
                if (bridge != null && bridge.getLocalServer() != null) {
                    WebResourceResponse res = bridge.getLocalServer().shouldInterceptRequest(request);
                    if (res != null) return res;
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (started) return;
                started = true;
                // a short pause so web fonts and images are drawn before the page is captured
                new Handler(Looper.getMainLooper()).postDelayed(() -> openPrintScreen(call, view, jobName, isA4, widthMm, heightMm), 350);
            }
        });

        String baseUrl = bridge != null && bridge.getLocalUrl() != null ? bridge.getLocalUrl() + "/" : "https://localhost/";
        web.loadDataWithBaseURL(baseUrl, html, "text/html", "UTF-8", null);
    }

    private void openPrintScreen(PluginCall call, WebView web, String jobName, boolean isA4, double widthMm, double heightMm) {
        PrintManager printManager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
        if (printManager == null) {
            cleanup();
            call.reject("Printing is not available on this phone");
            return;
        }

        PrintAttributes.MediaSize media;
        if (isA4) {
            media = PrintAttributes.MediaSize.ISO_A4;
        } else {
            // a roll of receipt paper: its width, and as long as this receipt (sizes are in thousandths of an inch)
            int widthMils = (int) Math.round(widthMm / 25.4 * 1000);
            int heightMils = (int) Math.round(Math.max(heightMm, 40) / 25.4 * 1000);
            media = new PrintAttributes.MediaSize("slipzen_roll_" + Math.round(widthMm), Math.round(widthMm) + "mm receipt", widthMils, heightMils);
        }
        PrintAttributes attributes = new PrintAttributes.Builder()
            .setMediaSize(media)
            .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
            .setColorMode(isA4 ? PrintAttributes.COLOR_MODE_COLOR : PrintAttributes.COLOR_MODE_MONOCHROME)
            .build();

        final PrintDocumentAdapter inner = web.createPrintDocumentAdapter(jobName);
        final PrintJob[] jobRef = new PrintJob[1];
        final boolean[] finished = new boolean[1];

        PrintDocumentAdapter adapter = new PrintDocumentAdapter() {
            @Override
            public void onStart() { inner.onStart(); }

            @Override
            public void onLayout(PrintAttributes oldAttributes, PrintAttributes newAttributes, CancellationSignal cancellationSignal, LayoutResultCallback callback, Bundle extras) {
                inner.onLayout(oldAttributes, newAttributes, cancellationSignal, callback, extras);
            }

            @Override
            public void onWrite(PageRange[] pages, ParcelFileDescriptor destination, CancellationSignal cancellationSignal, WriteResultCallback callback) {
                inner.onWrite(pages, destination, cancellationSignal, callback);
            }

            @Override
            public void onFinish() {
                inner.onFinish();
                if (finished[0]) return;
                finished[0] = true;
                // The print screen has closed. Give the job a moment to reach its final state, then report back.
                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    PrintJob job = jobRef[0];
                    boolean printed = job != null && !job.isCancelled() && !job.isFailed()
                        && (job.isQueued() || job.isStarted() || job.isCompleted() || job.isBlocked());
                    boolean failed = job != null && job.isFailed();
                    JSObject result = new JSObject();
                    result.put("printed", printed);
                    result.put("failed", failed);
                    result.put("cancelled", !printed && !failed);
                    cleanup();
                    call.resolve(result);
                }, 300);
            }
        };

        jobRef[0] = printManager.print(jobName, adapter, attributes);
    }

    private void cleanup() {
        if (printWebView != null) {
            try {
                printWebView.stopLoading();
                printWebView.destroy();
            } catch (Exception ignored) { }
            printWebView = null;
        }
    }
}
