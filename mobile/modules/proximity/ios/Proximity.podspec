Pod::Spec.new do |s|
  s.name           = 'Proximity'
  s.version        = '1.0.0'
  s.summary        = 'Screen-off-at-the-ear proximity monitoring for calls'
  s.license        = 'UNLICENSED'
  s.author         = 'AP Education'
  s.homepage       = 'https://github.com/AP-Education/ap-chats'
  s.platforms      = { :ios => '16.0' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.swift'
end
