using System;

namespace CarGame.Services
{
    /// <summary>
    /// No-operation Ads service used for Windows PC builds and testing environments.
    /// Safely provides reward callbacks without displaying ads or loading third-party ad SDKs.
    /// </summary>
    public sealed class NoOpAdsService : IAdsService
    {
        public bool IsInitialized => true;
        public bool IsRewardAdReady => true;

        public void ShowRewardAd(Action<bool> onComplete)
        {
            // On PC, reward callbacks complete successfully immediately
            onComplete?.Invoke(true);
        }

        public void ShowInterstitial(Action onDismissed = null)
        {
            onDismissed?.Invoke();
        }

        public void HideBanner()
        {
            // No-op on PC
        }
    }
}
