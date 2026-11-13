# 0007. Keep downloaded attachments outside the app document on iOS

## Context

The chat's file action opens a signed download URL through an anchor. Without an `onFileDownload` handler, iOS WKWebView can display the response as its main document. The app, its controls and its safe-area layout are replaced by the file. A provisional file navigation could also become the last page restored at launch.

## Decision

The iOS shell intercepts signed storage links with an attachment disposition before navigation, and also handles WKWebView's download response and presents the remote file in a separate native modal. Its Close button is outside the document WebView and inside a native safe area, with a minimum 44-point touch height. The original application WebView stays mounted.

Uploaded content has JavaScript disabled in the preview. Loading and error states belong below the same persistent toolbar. Only completed app-origin navigations update the restored page. Android retains its existing download handling.

## Verification

The native fixture exercises the production host with text, PDF and unavailable attachments. Closing a preview must preserve the original chat marker and draft. Unit tests cover download URL validation and provisional-navigation persistence. The fixture and repeatable checks live in `test/file-preview-native/README.md`.
