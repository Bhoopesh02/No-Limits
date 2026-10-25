using UnityEngine;

namespace CarGame.Data
{
    /// <summary>
    /// Single source of truth for player-facing branding, game titles, versions and bundle identifiers.
    /// All UI, splash screens, menus, and store dialogs reference this asset.
    /// </summary>
    [CreateAssetMenu(fileName = "GameInfo", menuName = "CarGame/Data/GameInfo", order = 0)]
    public sealed class GameInfo : ScriptableObject
    {
        [Header("Display Branding")]
        [Tooltip("Full player-facing game title.")]
        [SerializeField] private string _displayName = "No Limits";

        [Tooltip("Shortened display name for notifications and compact HUD/UI.")]
        [SerializeField] private string _shortName = "No Limits";

        [Header("Application Versioning")]
        [Tooltip("Semantic version string (e.g., 0.1.0).")]
        [SerializeField] private string _version = "0.1.0";

        [Tooltip("Shared bundle/package identifier for Android, iOS, and PC standalone.")]
        [SerializeField] private string _bundleId = "com.studio.nolimits";

        public string DisplayName => _displayName;
        public string ShortName => _shortName;
        public string Version => _version;
        public string BundleId => _bundleId;
    }
}
