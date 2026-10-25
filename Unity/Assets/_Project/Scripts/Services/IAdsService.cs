using System;

namespace CarGame.Services
{
    /// <summary>
    /// Contract for rewarded ads, interstitials, and banners.
    /// Mobile uses concrete network SDKs; PC uses NoOpAdsService.
    /// </summary>
    public interface IAdsService
    {
        bool IsInitialized { get; }
        bool IsRewardAdReady { get; }
        void ShowRewardAd(Action<bool> onComplete);
        void ShowInterstitial(Action onDismissed = null);
        void HideBanner();
    }
}
