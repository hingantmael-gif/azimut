Pod::Spec.new do |s|
  s.name           = 'MovaWorkoutKit'
  s.version        = '1.0.0'
  s.summary        = 'Planifie une séance Mova sur l’Apple Watch (WorkoutKit).'
  s.description    = 'Module Expo local : convertit le plan Mova en CustomWorkout WorkoutKit et le planifie sur l’Apple Watch.'
  s.author         = 'Mova'
  s.homepage       = 'https://mova.app'
  s.platforms      = { :ios => '17.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
