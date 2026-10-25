namespace CarGame.Services
{
    /// <summary>
    /// Service contract abstracting all platform-specific capabilities and graphics configurations.
    /// Eliminates the need for preprocessor directives (#if UNITY_STANDALONE / #if UNITY_ANDROID) across gameplay code.
    /// </summary>
    public interface IPlatformService
    {
        TargetPlatform Platform { get; }
        bool IsPC { get; }
        bool IsMobile { get; }
        bool SupportsAds { get; }
        bool SupportsInAppPurchases { get; }
        bool SupportsWindowedMode { get; }
        bool SupportsCustomResolution { get; }
        bool SupportsVSyncToggle { get; }
        bool SupportsFpsCap { get; }

        /// <summary>
        /// Default quality tier index: 0 = Low, 1 = Medium, 2 = High, 3 = Max.
        /// PC defaults to 2 (High).
        /// </summary>
        int DefaultQualityTierIndex { get; }

        void SetResolution(int width, int height, bool fullscreen);
        void SetVSync(bool enabled);
        void SetTargetFrameRate(int targetFps);
        string GetDeviceModel();
    }
}
