using UnityEngine;

namespace CarGame.Services
{
    /// <summary>
    /// Runtime platform provider resolving runtime capabilities and platform configurations cleanly.
    /// </summary>
    public sealed class PlatformService : IPlatformService
    {
        private readonly TargetPlatform _platform;

        public TargetPlatform Platform => _platform;
        public bool IsPC => _platform == TargetPlatform.WindowsStandalone;
        public bool IsMobile => _platform == TargetPlatform.Android || _platform == TargetPlatform.iOS;
        public bool SupportsAds => IsMobile;
        public bool SupportsInAppPurchases => IsMobile;
        public bool SupportsWindowedMode => IsPC;
        public bool SupportsCustomResolution => IsPC;
        public bool SupportsVSyncToggle => IsPC;
        public bool SupportsFpsCap => true;

        /// <summary>
        /// PC defaults to High (Tier 2). Mobile defaults to Medium (Tier 1) pending device benchmark/RAM assessment.
        /// </summary>
        public int DefaultQualityTierIndex => IsPC ? 2 : 1;

        public PlatformService()
        {
            RuntimePlatform current = Application.platform;

            if (current == RuntimePlatform.Android)
            {
                _platform = TargetPlatform.Android;
            }
            else if (current == RuntimePlatform.IPhonePlayer)
            {
                _platform = TargetPlatform.iOS;
            }
            else
            {
                // Default to Windows Standalone (including Editor execution on Windows)
                _platform = TargetPlatform.WindowsStandalone;
            }
        }

        public void SetResolution(int width, int height, bool fullscreen)
        {
            if (!SupportsCustomResolution)
            {
                return;
            }

            Screen.SetResolution(width, height, fullscreen ? FullScreenMode.FullScreenWindow : FullScreenMode.Windowed);
        }

        public void SetVSync(bool enabled)
        {
            if (!SupportsVSyncToggle)
            {
                return;
            }

            QualitySettings.vSyncCount = enabled ? 1 : 0;
        }

        public void SetTargetFrameRate(int targetFps)
        {
            Application.targetFrameRate = targetFps;
        }

        public string GetDeviceModel()
        {
            return SystemInfo.deviceModel;
        }
    }
}
