/**
 * Mastermoshai for Android and iPhone: the website (search, live class, exams,
 * tutor panel) in a native shell, so the app and site never drift apart.
 * Native parts: splash, Android back button, camera/mic for live class, screen
 * kept awake in class, offline screen, and files/other sites opened outside.
 */
import Constants from "expo-constants";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, PermissionsAndroid, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { onNotificationOpen } from "../src/notifications";
import { SITE_HOSTS, colors } from "../src/theme";

const SITE = ((Constants.expoConfig?.extra as { siteUrl?: string } | undefined)?.siteUrl ?? "https://mastermoshai.netlify.app").replace(/\/$/, "");
const FILE_RE = /\.(pdf|pptx?|docx?|xlsx?|zip|mp4)(\?|$)/i;

const isOurs = (url: string) => {
  try { return SITE_HOSTS.includes(new URL(url).host); } catch { return false; }
};
const isClass = (url: string) => /\/class\/[^/?#]+/.test(url);

async function askCameraMic() {
  if (Platform.OS !== "android") return; // iOS asks on first use (Info.plist strings in app.json)
  await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]).catch(() => null);
}

export default function App() {
  const web = useRef<WebView>(null);
  const [canBack, setCanBack] = useState(false);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [src, setSrc] = useState(`${SITE}/?source=app`);
  const inClass = useRef(false);

  // Android back button walks back through pages instead of closing the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canBack) { web.current?.goBack(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [canBack]);

  // Tapping a "class started" notification opens that class.
  useEffect(() => onNotificationOpen((path) => setSrc(`${SITE}${path}`)), []);

  const onNav = useCallback((nav: WebViewNavigation) => {
    setCanBack(nav.canGoBack);
    const now = isClass(nav.url);
    if (now && !inClass.current) { void askCameraMic(); void activateKeepAwakeAsync("class"); }
    if (!now && inClass.current) deactivateKeepAwake("class");
    inClass.current = now;
  }, []);

  // Our pages stay inside; other sites, bKash, phone links and downloads open outside.
  const onRequest = useCallback((req: { url: string; isTopFrame?: boolean }) => {
    const { url } = req;
    if (url.startsWith("about:") || url.startsWith("blob:") || url.startsWith("data:")) return true;
    if (isOurs(url) && !FILE_RE.test(url)) return true;
    if (req.isTopFrame === false) return true; // embedded frames (e.g. video players)
    void Linking.openURL(url);
    return false;
  }, []);

  if (offline) {
    return (
      <SafeAreaView style={[s.fill, s.center, { backgroundColor: colors.chalk }]}>
        <StatusBar style="dark" />
        <Text style={s.h}>নেট গেছে বেড়াতে!</Text>
        <Text style={s.p}>ইন্টারনেট ফিরলেই আবার শুরু করা যাবে। ওয়াই-ফাই বা মোবাইল ডেটা একবার দেখে নাও।</Text>
        <Pressable style={s.btn} onPress={() => { setOffline(false); web.current?.reload(); }}>
          <Text style={s.btnText}>আবার চেষ্টা করি</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.fill, { backgroundColor: colors.white }]} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <WebView
        ref={web}
        source={{ uri: src }}
        style={s.fill}
        applicationNameForUserAgent="MastermoshaiApp/1.0"
        // Live class: camera, mic and inline video without extra taps.
        mediaCapturePermissionGrantType="grant"
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        // Login cookie and the class "remember my answers" storage.
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        domStorageEnabled
        javaScriptEnabled
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        onNavigationStateChange={onNav}
        onShouldStartLoadWithRequest={onRequest}
        onLoadEnd={() => { setLoading(false); void SplashScreen.hideAsync(); }}
        onError={() => { setOffline(true); void SplashScreen.hideAsync(); }}
        onContentProcessDidTerminate={() => web.current?.reload()}
        onRenderProcessGone={() => web.current?.reload()}
      />
      {loading && (
        <View style={[StyleSheet.absoluteFill, s.center, { backgroundColor: colors.chalk }]} pointerEvents="none">
          <ActivityIndicator color={colors.board} size="large" />
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  h: { fontSize: 22, fontWeight: "700", color: colors.ink, marginBottom: 8 },
  p: { fontSize: 15, color: colors.muted, textAlign: "center", lineHeight: 24, marginBottom: 20 },
  btn: { backgroundColor: colors.board, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  btnText: { color: colors.white, fontWeight: "600", fontSize: 15 },
});
