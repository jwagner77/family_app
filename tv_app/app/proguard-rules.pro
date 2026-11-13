# Android TV Companion Proguard Rules
-keep class com.jwagner.familytv.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
