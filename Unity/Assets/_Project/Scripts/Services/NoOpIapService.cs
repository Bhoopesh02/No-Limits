using System;

namespace CarGame.Services
{
    /// <summary>
    /// No-operation IAP service used for Windows PC builds and testing environments.
    /// Safely handles purchase attempts without external store SDK dependencies.
    /// </summary>
    public sealed class NoOpIapService : IIapService
    {
        public bool IsInitialized => true;

        public void PurchaseProduct(string productId, Action<bool, string> onComplete)
        {
            // On PC standalone where IAP is disabled, invoke failure cleanly
            onComplete?.Invoke(false, "In-app purchases are not enabled on this platform.");
        }

        public void RestorePurchases(Action<bool> onComplete)
        {
            onComplete?.Invoke(true);
        }
    }
}
