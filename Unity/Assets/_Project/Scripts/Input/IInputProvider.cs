namespace CarGame.Input
{
    /// <summary>
    /// Uniform input contract consumed by Vehicle physics and controller modules.
    /// Decouples vehicle simulation completely from underlying hardware (Keyboard, Gamepad, Steering Wheel, Mobile Touch/Tilt).
    /// </summary>
    public interface IInputProvider
    {
        /// <summary>
        /// Normalized forward acceleration demand in the range [0.0, 1.0].
        /// </summary>
        float Throttle { get; }

        /// <summary>
        /// Normalized braking demand in the range [0.0, 1.0].
        /// </summary>
        float Brake { get; }

        /// <summary>
        /// Normalized horizontal steering demand in the range [-1.0, 1.0].
        /// Negative indicates left, positive indicates right.
        /// </summary>
        float Steering { get; }

        /// <summary>
        /// Immediate emergency handbrake engagement.
        /// </summary>
        bool Handbrake { get; }

        /// <summary>
        /// Nitro boost activation state.
        /// </summary>
        bool Nitro { get; }

        /// <summary>
        /// True on the exact frame manual upshift is requested.
        /// </summary>
        bool ShiftUp { get; }

        /// <summary>
        /// True on the exact frame manual downshift is requested.
        /// </summary>
        bool ShiftDown { get; }

        /// <summary>
        /// Quick rear camera view toggle.
        /// </summary>
        bool LookBack { get; }

        /// <summary>
        /// Vehicle track respawn or recovery request.
        /// </summary>
        bool Respawn { get; }

        /// <summary>
        /// Currently active input hardware type (used for dynamic UI prompt switching).
        /// </summary>
        InputDeviceType ActiveDeviceType { get; }
    }
}
