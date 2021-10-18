import React, { Component } from "react";
import { BackHandler, Platform, View, StyleSheet, Alert, TouchableOpacity, SafeAreaView, Linking } from "react-native";
import { WebView } from "react-native-webview";
import SplashScreen from "react-native-splash-screen";
import { getStatusBarHeight } from "react-native-status-bar-height";
import messaging from "@react-native-firebase/messaging";
import AsyncStorage from "@react-native-community/async-storage";
import PushNotificationIOS from "@react-native-community/push-notification-ios";
import CookieManager from '@react-native-community/cookies';
//import IconLeft from "./components/IconLeft";
//import IconRight from "./components/IconRight";

const PushNotification = require("react-native-push-notification");
const domain = "http://dev.cojam.io";
//const domain = "http://localhost:8090";
const domain_home = "/user/home";
let pushID = 0;

class MyWebComponent extends Component {
  constructor(props) {
    super(props);

    this.state = {
      indexPage: { uri: domain + domain_home },
    };
  }

  webView = {
    canGoBack: false,
    ref: null,
  };

  onAndroidBackPress = () => {
    if (this.webView.canGoBack && this.webView.ref) {
      this.webView.ref.goBack();
      return true;
    }
    return false;
  };

  async componentDidMount() {
    PushNotification.configure({
      // (optional) Called when Token is generated (iOS and Android)
      onRegister: function(info: any) {
        console.log("onRegister:" + JSON.stringify(info));
      },
      // (required) Called when a remote is received or opened, or local notification is opened
      onNotification: this.customOnNotification,
      // (optional) Called when Registered Action is pressed and invokeApp is false, if true onNotification will be called (Android)
      onAction: function(notification: any) {
        console.debug("onAction:" + JSON.stringify(notification.action));
        console.debug("NOTIFICATION:", notification);
        // process the action
      },
      // (optional) Called when the user fails to register for remote notifications. Typically occurs when APNS is having issues, or the device is a simulator. (iOS)
      onRegistrationError: function(err: any) {
        console.log("err::" + err);
      },
      // IOS ONLY (optional): default: all - Permissions to register.
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      // Should the initial notification be popped automatically
      // default: true
      popInitialNotification: true,
      /**
       * (optional) default: true
       * - Specified if permissions (ios) and token (android and ios) will requested or not,
       * - if not, you must call PushNotificationsHandler.requestPermissions() later
       * - if you are not using remote notification or do not have Firebase installed, use this:
       *     requestPermissions: Platform.OS === 'ios'
       */
      requestPermissions: true,
    });

    if (Platform.OS === "android") {
      BackHandler.addEventListener(
        "hardwareBackPress",
        this.onAndroidBackPress,
      );
    }


    setTimeout(() => {
      SplashScreen.hide();
      checkFCMPermission();
    }, 2000);


    messaging().getInitialNotification().then(this.handleSelected);


    // 앱 포그라운드 상태에서 메시지 수신시
    const aaaa = messaging().onMessage(async remoteMessage => {
      const title = remoteMessage.data?.title;
      const message = remoteMessage.data?.message;
      const pictureUrl = remoteMessage.data?.pictureUrl;
      PushNotification.localNotification({
        id: pushID++,
        title: `${title}`,
        message: `${message}`,
        data: remoteMessage.data,
        userInfo: remoteMessage.data,
        smallIcon: "notification_icon",
        largeIcon: "ic_launcher", // (optional) default: "ic_launcher". Use "" for no large icon.
        largeIconUrl: `${pictureUrl}`, // (optional) default: undefined
        bigPictureUrl: `${pictureUrl}`, // (optional) default: undefined
        bigLargeIconUrl: `${pictureUrl}`, // (optional) default: undefined
        onNotification: true
      });
    });

    return aaaa;
  }

  customOnNotification = async notification => {

    if (notification?.userInteraction) {
      let checkLink = false;
      let pushUrl = "";
      if (notification.data.pushType && notification.data.pushKey) {
        const pushType = notification.data.pushType;
        const pushKey = notification.data.pushKey;
        if (pushType ==='NOTICE'){
          checkLink = true;
          pushUrl = '/user/result/view?idx='+pushKey;
        }

      }

      if (checkLink) {
        this.webView.ref.postMessage(pushUrl);
      }
    }

    notification.finish(PushNotificationIOS.FetchResult.NoData);
  };

  handleSelected = async remoteMessage => {
    console.debug('handleSelected',remoteMessage);
    if (remoteMessage) {
      let checkLink = false;
      let pushUrl = "";

      if (remoteMessage.data.pushType && remoteMessage.data.pushKey) {
        const pushType = notification.data.pushType;
        const pushKey = notification.data.pushKey;
        if (pushType ==='NOTICE'){
          checkLink = true;
          pushUrl = '/user/result/view?idx='+pushKey;
        }

      }

      if (checkLink) {
        setTimeout(() => {
          this.webView.ref.postMessage(pushUrl);
        }, 1000);
      }

    }
  };

  componentWillUnmount() {
    if (Platform.OS === "android") {
      BackHandler.removeEventListener("hardwareBackPress");
    }
  }

  /** 웹뷰에서 rn으로 값을 보낼때 거치는 함수 */
  handleOnMessage = ({ nativeEvent: { data } }) => {
    // data에 웹뷰에서 보낸 값이 들어옵니다.
    console.log(JSON.parse(data));
    data = JSON.parse(data);
    const type = data.type;

    if (type === "login") {
      CookieManager.getAll(true).then(res => {
        if(res.SESSION){
          const session = res.SESSION
          this.setCookie(session);
        }
      });
      AsyncStorage.setItem("PUSH_USER_KEY", JSON.stringify(data.key));
      checkFCMPermission();
    } else if (type === "logout") {
      AsyncStorage.setItem("PUSH_USER_KEY", "");
      CookieManager.clearByName(domain, 'SESSION')
        .then((success) => {
          console.log('CookieManager.clearByName =>', success);
        });
      checkFCMPermission();
    }
  };


  _onShouldStartLoadWithRequest = (event) => {
    const {url} = event;

    if (Platform.OS === 'ios') {

      if (
        (
            url.includes('cojam.io')
          ||
            url.includes('127.0.0.1')
          ||
            url.includes('localhost')
          ||
            url.includes('youtube')
        )
        &&
        !url.includes('.pdf')
        &&
        !url.includes('/watch?')
      ) {
        return true;
      }

      Linking.openURL(url).catch((err) => {
        console.log(
          '앱 실행이 실패했습니다. 설치가 되어있지 않은 경우 설치하기 버튼을 눌러주세요.',
        );
      });
      return false;
    }
  };

  setCookie = cookie => {
    CookieManager.set(domain, {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      version: cookie.version,
      expires: '2023-05-30T12:30:00.00-05:00'
    }).then((done) => {
      console.log('CookieManager.set =>', done);
    });
  };

  render() {
    return (
      <View style={styles.container}>
        <WebView
          style={styles.webview}
          source={this.state.indexPage}
          originWhitelist={["*"]}
          ref={webView => {
            this.webView.ref = webView;
          }}
          onNavigationStateChange={navState => {
            this.webView.canGoBack = navState.canGoBack;
          }}
          onShouldStartLoadWithRequest={this._onShouldStartLoadWithRequest.bind(
            this,
          )}
          javaScriptEnabled={true}
          useWebKit={true}
          bounces={false}
          allowFileAccess={true}
          sharedCookiesEnabled={true}
          domStorageEnabled={true}
          geolocationEnabled={true}
          saveFormDataDisabled={true}
          allowFileAccessFromFileURLS={true}
          allowUniversalAccessFromFileURLs={true}
          startInLoadingState={true}
          onMessage={this.handleOnMessage}
          allowsInlineMediaPlayback={true}
          cacheEnabled={true}
        />
        {/*
        {
          Platform.OS == "ios" &&
          (
            <View style={styles.browserBar}>
              <TouchableOpacity onPress={() => {
                this.webView.ref.goBack();
              }}>
                <IconLeft width={40} height={40} color={"#fff"} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => {
                this.webView.ref.goForward();
              }}>
                <IconRight width={40} height={40} color={"#fff"} />
              </TouchableOpacity>
            </View>
          )
        }*/}
        <SafeAreaView style={{ backgroundColor: "#ffffff" }}></SafeAreaView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
    alignItems: "stretch", // 이부분 중요 이거 안써주면 WebView 에 width 값을 지정해야함..
    justifyContent: "center",
    paddingTop: getStatusBarHeight(true),
  },
  browserBar: {
    height: 60,
    width: "100%",
    backgroundColor: "black",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 60,
    justifyContent: "space-between",
  },
  icon: {
    width: 30,
    height: 30,
    tintColor: "white",
    resizeMode: "contain",
  },
  webview: {
    flex: 1,
  },
});

export default MyWebComponent;


export const requestPermission = async (): Promise<boolean> => {
  try {
    // User has authorised
    const granted = await messaging().requestPermission({
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      provisional: false,
      sound: true,
    });

    if (
      Platform.OS === "ios" &&
      granted == messaging.AuthorizationStatus.DENIED
    ) {
      return false;
    } else if (granted == messaging.AuthorizationStatus.AUTHORIZED) {
      await updateTokenToServer();
    }
  } catch (error) {
    // User has rejected permissions
    // alert("you can't handle push notification")
  }
  return true;
};

export const checkFCMPermission = async (): Promise<void> => {
  const enabled = await messaging().hasPermission();
  console.log("messaging().hasPermission() :: " + enabled);
  if (enabled == messaging.AuthorizationStatus.NOT_DETERMINED) {
    requestPermission();
  } else if (enabled == messaging.AuthorizationStatus.AUTHORIZED) {
    // user has permissions

    const pushConfirm = JSON.parse(
      await AsyncStorage.getItem("PUSH_CONFIRM_YN"),
    );
    if (
      Platform.OS === "android" &&
      (pushConfirm === null)
    ) {
      Alert.alert(
        "수신 동의",
        "앱에서 보내는 알림 수신에 동의 하시겠습니까?",
        [
          {
            text: "Cancel",
            onPress: () =>
              AsyncStorage.setItem("PUSH_CONFIRM_YN", JSON.stringify("N")),
            style: "cancel",
          },
          { text: "OK", onPress: () => updateTokenToServer() },
        ],
        { cancelable: false },
      );
    } else {
      requestPermission();
    }
  } else {
    // user doesn't have permission
    requestPermission();
  }
};

const updateTokenToServer = async (): Promise<void> => {
  messaging().setAutoInitEnabled(true);
  const fcmToken = await messaging().getToken();

  const pushUserKey = JSON.parse(await AsyncStorage.getItem("PUSH_USER_KEY"));
  try {
    if (fcmToken) {

      let deviceType;
      if (Platform.OS === "android") {
        deviceType = "A";
      } else {
        deviceType = "I";
      }

      const param = { token: fcmToken, deviceType: deviceType, memberKey: "" };
      console.debug("fcmToken", fcmToken);
      console.debug("pushUserKey", pushUserKey);
      if (pushUserKey == "") {
        param.memberKey = "";
      } else {
        param.memberKey = pushUserKey;
      }

      console.debug("param", param);

      //저장 PUSH
      fetch(
        domain + "/saveDeviceInfo",
        {
          method: "POST",
          body: JSON.stringify(param),
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
        .then(res => {
          AsyncStorage.setItem("PUSH_CONFIRM_YN", JSON.stringify("Y"));
        })
        .catch(error => {
          console.log(error);
        });
    }
  } catch (error) {
    // Alert.toast({ desc: error })
  }
};
