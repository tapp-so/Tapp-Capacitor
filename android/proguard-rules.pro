# Capacitor discovers plugin methods and annotations through reflection.
-keep @com.getcapacitor.annotation.CapacitorPlugin class so.tapp.capacitor.TappPlugin { *; }
-keepattributes RuntimeVisibleAnnotations,AnnotationDefault,Signature,InnerClasses,EnclosingMethod

# Native SDK request models are serialized by the SDK.
-keep class com.example.tapp.services.network.RequestModels$* { *; }
-keep class com.example.tapp.utils.TappConfiguration { *; }
-keep class com.example.tapp.utils.TappConfiguration$* { *; }
-keep class com.example.tapp.models.** { *; }
