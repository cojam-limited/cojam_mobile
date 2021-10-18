/**
 * @format
 */

import {AppRegistry , Platform} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import messaging from '@react-native-firebase/messaging';
messaging().setBackgroundMessageHandler(async (remoteMessage): Promise<any> => {
  console.debug('Message handled in the background!', remoteMessage);
});
AppRegistry.registerComponent(appName, () => App);
