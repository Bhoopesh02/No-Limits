using NUnit.Framework;
using CarGame.Core;
using CarGame.Services;

namespace CarGame.Tests.EditMode
{
    [TestFixture]
    public sealed class PlatformServiceTests
    {
        [SetUp]
        public void SetUp()
        {
            ServiceLocator.ClearAll();
            EventBus.ClearAll();
        }

        [TearDown]
        public void TearDown()
        {
            ServiceLocator.ClearAll();
            EventBus.ClearAll();
        }

        [Test]
        public void PlatformService_WhenCreatedOnStandaloneOrEditor_DetectsCorrectPlatformCapabilities()
        {
            IPlatformService platform = new PlatformService();

            if (platform.IsPC)
            {
                Assert.That(platform.SupportsAds, Is.False);
                Assert.That(platform.SupportsInAppPurchases, Is.False);
                Assert.That(platform.SupportsWindowedMode, Is.True);
                Assert.That(platform.SupportsCustomResolution, Is.True);
                Assert.That(platform.DefaultQualityTierIndex, Is.EqualTo(2)); // High
            }
            else
            {
                Assert.That(platform.SupportsAds, Is.True);
                Assert.That(platform.SupportsInAppPurchases, Is.True);
                Assert.That(platform.DefaultQualityTierIndex, Is.EqualTo(1)); // Medium
            }
        }

        [Test]
        public void NoOpAdsService_CompletesRewardCallbackSuccessfully()
        {
            IAdsService ads = new NoOpAdsService();
            bool rewardGranted = false;

            ads.ShowRewardAd(success => rewardGranted = success);

            Assert.That(rewardGranted, Is.True);
        }

        [Test]
        public void ServiceLocator_CanRegisterAndRetrievePlatformService()
        {
            IPlatformService platform = new PlatformService();
            ServiceLocator.Register<IPlatformService>(platform);

            IPlatformService retrieved = ServiceLocator.Get<IPlatformService>();

            Assert.That(retrieved, Is.Not.Null);
            Assert.That(retrieved, Is.SameAs(platform));
        }

        private struct TestEvent
        {
            public int Value;
        }

        [Test]
        public void EventBus_PublishesAndReceivesEventCorrectly()
        {
            int receivedValue = 0;
            EventBus.Subscribe<TestEvent>(e => receivedValue = e.Value);

            EventBus.Raise(new TestEvent { Value = 42 });

            Assert.That(receivedValue, Is.EqualTo(42));
        }
    }
}
