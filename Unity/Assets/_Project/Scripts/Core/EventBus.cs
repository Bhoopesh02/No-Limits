using System;
using System.Collections.Generic;

namespace CarGame.Core
{
    /// <summary>
    /// Type-safe, decoupled event dispatcher allowing inter-module communication without direct references.
    /// Allocates only upon subscribing/unsubscribing; zero allocations during Raise operations.
    /// </summary>
    public static class EventBus
    {
        private static class EventStorage<T>
        {
            public static Action<T> Callbacks;
        }

        private static readonly List<Action> ClearActions = new List<Action>();

        public static void Subscribe<T>(Action<T> handler)
        {
            if (handler == null) return;

            if (EventStorage<T>.Callbacks == null)
            {
                ClearActions.Add(Clear<T>);
            }

            EventStorage<T>.Callbacks += handler;
        }

        public static void Unsubscribe<T>(Action<T> handler)
        {
            if (handler == null) return;
            EventStorage<T>.Callbacks -= handler;
        }

        public static void Raise<T>(T eventArgs)
        {
            EventStorage<T>.Callbacks?.Invoke(eventArgs);
        }

        public static void Clear<T>()
        {
            EventStorage<T>.Callbacks = null;
        }

        public static void ClearAll()
        {
            for (int i = 0; i < ClearActions.Count; i++)
            {
                ClearActions[i]?.Invoke();
            }
            ClearActions.Clear();
        }
    }
}
