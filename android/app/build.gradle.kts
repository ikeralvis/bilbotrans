plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "eus.bilbotrans.widget"
    compileSdk = 34

    defaultConfig {
        applicationId = "eus.bilbotrans.widget"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"
    }

    // La clave de firma no está en el repo: el workflow de GitHub la pasa por variables de entorno (BT_KEYSTORE…).
    val keystorePath = System.getenv("BT_KEYSTORE")
    signingConfigs {
        if (keystorePath != null) {
            create("shared") {
                storeFile = file(keystorePath)
                storePassword = System.getenv("BT_STORE_PASS")
                keyAlias = System.getenv("BT_KEY_ALIAS")
                keyPassword = System.getenv("BT_STORE_PASS")
            }
        }
    }

    buildTypes {
        release {
            if (keystorePath != null) signingConfig = signingConfigs.getByName("shared")
            isMinifyEnabled = false
        }
    }

    lint {
        checkReleaseBuilds = false
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.work:work-runtime-ktx:2.9.1")
}
