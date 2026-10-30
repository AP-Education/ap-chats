import UIKit
import WebKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    func application(_ application: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = SearchController()
        window.makeKeyAndVisible()
        self.window = window
        return true
    }
}

class SearchController: UIViewController, WKScriptMessageHandler {
    private var web: WKWebView!
    override func viewDidLoad() {
        super.viewDidLoad()
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.userContentController.add(self, name: "qaLog")
        config.userContentController.addUserScript(WKUserScript(source: "window.addEventListener('error', e => window.webkit.messageHandlers.qaLog.postMessage(e.message));", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        web = WKWebView(frame: .zero, configuration: config)
        web.allowsBackForwardNavigationGestures = true
        web.translatesAutoresizingMaskIntoConstraints = false
        view.backgroundColor = .systemBackground
        view.addSubview(web)
        NSLayoutConstraint.activate([
            web.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            web.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            web.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)
        ])
        web.load(URLRequest(url: URL(string: "http://127.0.0.1:5570/")!, cachePolicy: .reloadIgnoringLocalCacheData))
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardChanged), name: UIResponder.keyboardWillChangeFrameNotification, object: nil)
    }
    @objc private func keyboardChanged(_ event: Notification) {
        guard let frame = event.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else { return }
        let keyboard = view.convert(frame, from: nil)
        let overlap = max(0, web.frame.maxY - keyboard.minY)
        web.evaluateJavaScript("document.documentElement.style.setProperty('--app-keyboard-inset','\(overlap)px')")
    }
    deinit { NotificationCenter.default.removeObserver(self) }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        print("[Search QA JS] \(message.body)")
    }
}
