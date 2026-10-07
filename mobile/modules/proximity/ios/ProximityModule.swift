import ExpoModulesCore
import UIKit

public class ProximityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Proximity")

    Function("setMonitoring") { (enabled: Bool) in
      UIDevice.current.isProximityMonitoringEnabled = enabled
    }.runOnQueue(.main)
  }
}
