using System;

namespace CarGame.Services
{
    /// <summary>
    /// Contract for in-app purchases across mobile stores.
    /// Mobile uses Google Play Billing and Apple StoreKit; PC uses NoOpIapService.
    /// </summary>
    public interface IIapService
    {
        bool IsInitialized { get; }
        void PurchaseProduct(string productId, Action<bool, string> onComplete);
        void RestorePurchases(Action<bool> onComplete);
    }
}
