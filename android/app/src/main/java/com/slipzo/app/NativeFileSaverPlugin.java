package com.slipzo.app;

import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Native Android helper plugin for writing generated receipt PDFs directly to
 * device storage (since Android WebView ignores blob: anchor downloads) and
 * opening saved PDFs via an external viewer intent.
 */
@CapacitorPlugin(name = "NativeFileSaver")
public class NativeFileSaverPlugin extends Plugin {

    private final ExecutorService ioExecutor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void savePdf(PluginCall call) {
        final String rawFilename = call.getString("filename");
        final String base64Data = call.getString("base64Data");
        final String mimeType = call.getString("mimeType", "application/pdf");

        if (base64Data == null || base64Data.trim().isEmpty()) {
            call.reject("Missing PDF data");
            return;
        }

        final String safeFilename = sanitizePdfFilename(rawFilename);
        final Context context = getContext().getApplicationContext();

        ioExecutor.execute(() -> {
            try {
                String cleanBase64 = base64Data.trim();
                int commaIdx = cleanBase64.indexOf(',');
                if (cleanBase64.startsWith("data:") && commaIdx >= 0) {
                    cleanBase64 = cleanBase64.substring(commaIdx + 1);
                }

                byte[] bytes = Base64.decode(cleanBase64, Base64.DEFAULT);
                if (bytes == null || bytes.length == 0) {
                    call.reject("Generated PDF is empty");
                    return;
                }

                JSObject result;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    result = saveWithMediaStore(context, safeFilename, mimeType, bytes);
                } else {
                    result = saveToAppDownloads(context, safeFilename, bytes);
                }

                call.resolve(result);
            } catch (Exception e) {
                call.reject("Failed to save PDF: " + e.getMessage(), e);
            }
        });
    }

    @PluginMethod
    public void openPdf(PluginCall call) {
        String uriStr = call.getString("uri");
        String mimeType = call.getString("mimeType", "application/pdf");

        if (uriStr == null || uriStr.trim().isEmpty()) {
            call.reject("Missing PDF URI");
            return;
        }

        try {
            Uri uri = Uri.parse(uriStr.trim());
            Intent viewIntent = new Intent(Intent.ACTION_VIEW);
            viewIntent.setDataAndType(uri, mimeType);
            viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);

            Intent chooser = Intent.createChooser(viewIntent, "Open Receipt PDF");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            if (getActivity() != null) {
                getActivity().startActivity(chooser);
            } else {
                getContext().startActivity(chooser);
            }
            call.resolve();
        } catch (ActivityNotFoundException e) {
            call.reject("No PDF viewer app found on this device", e);
        } catch (Exception e) {
            call.reject("Unable to open PDF: " + e.getMessage(), e);
        }
    }

    private JSObject saveWithMediaStore(Context context, String filename, String mimeType, byte[] bytes) throws Exception {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            return saveToAppDownloads(context, filename, bytes);
        }

        ContentResolver resolver = context.getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
        values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
        values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Slipzen");
        values.put(MediaStore.Downloads.IS_PENDING, 1);

        Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        Uri itemUri = resolver.insert(collection, values);
        if (itemUri == null) {
            return saveToAppDownloads(context, filename, bytes);
        }

        try (OutputStream out = resolver.openOutputStream(itemUri)) {
            if (out == null) {
                resolver.delete(itemUri, null, null);
                throw new IllegalStateException("Could not open MediaStore output stream");
            }
            out.write(bytes);
            out.flush();
        } catch (Exception writeErr) {
            resolver.delete(itemUri, null, null);
            throw writeErr;
        }

        ContentValues publishValues = new ContentValues();
        publishValues.put(MediaStore.Downloads.IS_PENDING, 0);
        resolver.update(itemUri, publishValues, null, null);

        JSObject res = new JSObject();
        res.put("saved", true);
        res.put("uri", itemUri.toString());
        res.put("filename", filename);
        res.put("location", "Downloads/Slipzen/" + filename);
        return res;
    }

    private JSObject saveToAppDownloads(Context context, String filename, byte[] bytes) throws Exception {
        File baseDir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (baseDir == null) {
            baseDir = new File(context.getCacheDir(), "downloads");
        }
        File targetDir = new File(baseDir, "Slipzen");
        if (!targetDir.exists() && !targetDir.mkdirs()) {
            throw new IllegalStateException("Unable to create download directory");
        }

        File outFile = new File(targetDir, filename);
        try (FileOutputStream fos = new FileOutputStream(outFile)) {
            fos.write(bytes);
            fos.flush();
        }

        Uri contentUri = FileProvider.getUriForFile(
            context,
            context.getPackageName() + ".fileprovider",
            outFile
        );

        JSObject res = new JSObject();
        res.put("saved", true);
        res.put("uri", contentUri.toString());
        res.put("filename", filename);
        res.put("location", "App Downloads/Slipzen/" + filename);
        return res;
    }

    private String sanitizePdfFilename(String raw) {
        String base = (raw == null || raw.trim().isEmpty())
            ? ("Slipzen_Receipt_" + System.currentTimeMillis() + ".pdf")
            : raw.trim().replaceAll("[^a-zA-Z0-9._-]", "_");
        if (!base.toLowerCase().endsWith(".pdf")) {
            base = base + ".pdf";
        }
        return base;
    }
}

