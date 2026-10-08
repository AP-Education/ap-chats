import ExpoModulesCore
import UIKit

public class ProximityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Proximity")

    // Async so it can hop to the main queue, where UIKit requires the change.
    AsyncFunction("setMonitoring") { (enabled: Bool) in
      UIDevice.current.isProximityMonitoringEnabled = enabled
    }.runOnQueue(.main)
  }
}
