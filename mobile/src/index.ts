import './features/calls/background/call-session';
import './features/calls/background/ring-ended-task';

import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';

import App from './App';
import { CallWindow } from './features/calls';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Android's CallActivity draws a call alone over the lock screen with this root, from the same runtime.
AppRegistry.registerComponent('call', () => CallWindow);
