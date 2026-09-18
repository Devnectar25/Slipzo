package com.slipzo.app;

import android.content.Context;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;
import java.util.concurrent.atomic.AtomicBoolean;

public class MainActivity extends BridgeActivity {
    private WebView mPrintWebView;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        attachPrintInterface();
    }

    @Override
    public void onStart() {
        super.onStart();
        attachPrintInterface();
    }

    @Override
    public void onResume() {
        super.onResume();
        attachPrintInterface();
    }

    private void attachPrintInterface() {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (bridge != null && bridge.getWebView() != null) {
                        WebView webView = bridge.getWebView();
                        webView.getSettings().setJavaScriptEnabled(true);
                        webView.addJavascriptInterface(new WebAppInterface(MainActivity.this), "AndroidPrintInterface");
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        });
    }

    public class WebAppInterface {
        Context mContext;

        WebAppInterface(Context c) {
            mContext = c;
        }

        @JavascriptInterface
        public void printPage(final String htmlContent, final String jobName) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        final PrintManager printManager = (PrintManager) mContext.getSystemService(Context.PRINT_SERVICE);
                        if (printManager == null) return;

                        final String name = (jobName != null && !jobName.isEmpty()) ? jobName : "Slipzo Receipt";

                        // Retain strong instance reference to prevent Garbage Collection during background loading
                        mPrintWebView = new WebView(mContext);
                        mPrintWebView.getSettings().setJavaScriptEnabled(true);

                        final AtomicBoolean printed = new AtomicBoolean(false);

                        final Runnable triggerPrint = new Runnable() {
                            @Override
                            public void run() {
                                if (printed.compareAndSet(false, true)) {
                                    try {
                                        PrintDocumentAdapter printAdapter;
                                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                                            printAdapter = mPrintWebView.createPrintDocumentAdapter(name);
                                        } else {
                                            printAdapter = mPrintWebView.createPrintDocumentAdapter();
                                        }
                                        printManager.print(name, printAdapter, new PrintAttributes.Builder().build());
                                    } catch (Exception e) {
                                        e.printStackTrace();
                                    }
                                }
                            }
                        };

                        final Handler timeoutHandler = new Handler(Looper.getMainLooper());

                        mPrintWebView.setWebViewClient(new WebViewClient() {
                            @Override
                            public void onPageFinished(WebView view, String url) {
                                timeoutHandler.removeCallbacks(triggerPrint);
                                triggerPrint.run();
                            }
                        });

                        mPrintWebView.loadDataWithBaseURL("file:///android_asset/", htmlContent, "text/html", "UTF-8", null);

                        // Fallback: trigger after 600ms in case onPageFinished fails to fire on some custom Android ROMs (MIUI/ColorOS)
                        timeoutHandler.postDelayed(triggerPrint, 600);

                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            });
        }
    }
}


