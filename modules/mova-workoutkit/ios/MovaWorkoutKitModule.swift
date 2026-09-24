import ExpoModulesCore
import HealthKit
import WorkoutKit

// NON COMPILÉ NI TESTÉ : écrit sans Mac ni Xcode. À vérifier au premier build iOS (voir docs/APPLE_WATCH.md).
// Lit le plan JSON produit par buildAppleWorkoutPlan() (src/engines/watchFileFormats.ts) et le planifie
// dans l'app Exercice de l'Apple Watch via WorkoutScheduler (iOS 17+ / watchOS 10+).

public class MovaWorkoutKitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MovaWorkoutKit")

    Function("isSupported") { () -> Bool in
      if #available(iOS 17.0, *) {
        return WorkoutScheduler.isSupported
      }
      return false
    }

    AsyncFunction("schedule") { (json: String) async throws -> String in
      guard #available(iOS 17.0, *) else {
        throw Exception(name: "MovaWorkoutKit", description: "Apple Watch : iOS 17 minimum requis.")
      }
      guard WorkoutScheduler.isSupported else {
        throw Exception(name: "MovaWorkoutKit", description: "Planification Apple Watch indisponible sur cet appareil.")
      }
      let state = await WorkoutScheduler.shared.requestAuthorization()
      guard state == .authorized else {
        throw Exception(name: "MovaWorkoutKit", description: "Autorisation refusée : active-la dans Réglages › Mova.")
      }
      let (plan, date) = try MovaWorkoutBuilder.build(json: json)
      await WorkoutScheduler.shared.schedule(plan, at: date)
      return "scheduled"
    }
  }
}

@available(iOS 17.0, *)
enum MovaWorkoutBuilder {
  static func build(json: String) throws -> (WorkoutPlan, DateComponents) {
    guard
      let data = json.data(using: .utf8),
      let root = try JSONSerialization.jsonObject(with: data) as? [String: Any]
    else {
      throw Exception(name: "MovaWorkoutKit", description: "Plan de séance illisible.")
    }

    let activity = activityType(root["activity"] as? String)
    let warmup = (root["warmup"] as? [String: Any]).map { step($0) }
    let cooldown = (root["cooldown"] as? [String: Any]).map { step($0) }

    var blocks: [IntervalBlock] = []
    for raw in (root["blocks"] as? [[String: Any]]) ?? [] {
      let iterations = max(1, (raw["iterations"] as? Int) ?? 1)
      var steps: [IntervalStep] = []
      for s in (raw["steps"] as? [[String: Any]]) ?? [] {
        let purpose: IntervalStep.Purpose = (s["purpose"] as? String) == "recovery" ? .recovery : .work
        steps.append(IntervalStep(purpose, step: step(s)))
      }
      if !steps.isEmpty {
        blocks.append(IntervalBlock(steps: steps, iterations: iterations))
      }
    }
    if blocks.isEmpty {
      throw Exception(name: "MovaWorkoutKit", description: "Séance sans étape à planifier.")
    }

    let workout = CustomWorkout(
      activity: activity,
      location: activity == .swimming ? .pool : .outdoor,
      displayName: root["displayName"] as? String,
      warmup: warmup,
      blocks: blocks,
      cooldown: cooldown
    )
    return (WorkoutPlan(.custom(workout)), dateComponents(root["scheduledDate"] as? String))
  }

  private static func step(_ raw: [String: Any]) -> WorkoutStep {
    WorkoutStep(goal: goal(raw["goal"] as? [String: Any]), displayName: raw["displayName"] as? String)
  }

  private static func goal(_ raw: [String: Any]?) -> WorkoutGoal {
    guard let raw = raw, let type = raw["type"] as? String else { return .open }
    let value = (raw["value"] as? Double) ?? Double((raw["value"] as? Int) ?? 0)
    switch type {
    case "time" where value > 0:
      return .time(value, .seconds)
    case "distance" where value > 0:
      return .distance(value, .meters)
    default:
      return .open
    }
  }

  private static func activityType(_ name: String?) -> HKWorkoutActivityType {
    switch name {
    case "cycling": return .cycling
    case "swimming": return .swimming
    case "traditionalStrengthTraining": return .traditionalStrengthTraining
    default: return .running
    }
  }

  private static func dateComponents(_ iso: String?) -> DateComponents {
    let parts = (iso ?? "").split(separator: "-").compactMap { Int($0) }
    if parts.count == 3 {
      return DateComponents(year: parts[0], month: parts[1], day: parts[2], hour: 8, minute: 0)
    }
    return Calendar.current.dateComponents([.year, .month, .day], from: Date())
  }
}
