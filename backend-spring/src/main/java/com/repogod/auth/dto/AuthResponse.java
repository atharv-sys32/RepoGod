package com.repogod.auth.dto;

public class AuthResponse {

    private String accessToken;
    private String refreshToken;
    private String email;
    private String displayName;

    public AuthResponse() {
    }

    public AuthResponse(String accessToken, String refreshToken, String email, String displayName) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.email = email;
        this.displayName = displayName;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }
}
