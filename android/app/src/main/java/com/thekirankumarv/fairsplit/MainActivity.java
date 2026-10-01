package com.thekirankumarv.fairsplit;

import android.os.Bundle;

import androidx.appcompat.app.AppCompatDelegate;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // FairSplit only has a dark interface. Without this the activity
        // follows the system setting, so on a phone in light mode the native
        // date picker and select dialogs resolve dark text and draw it on the
        // dark surface the web view asks for, leaving them unreadable.
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES);
        super.onCreate(savedInstanceState);
    }
}
