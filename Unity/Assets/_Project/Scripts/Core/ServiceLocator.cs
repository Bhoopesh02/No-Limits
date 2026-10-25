using System;
using System.Collections.Generic;

namespace CarGame.Core
{
    /// <summary>
    /// Lightweight service locator providing decoupled access to application services.
    /// </summary>
    public static class ServiceLocator
    {
        private static readonly Dictionary<Type, object> Services = new Dictionary<Type, object>();

        public static void Register<T>(T service) where T : class
        {
            Type type = typeof(T);
            if (service == null)
            {
                Services.Remove(type);
                return;
            }

            Services[type] = service;
        }

        public static T Get<T>() where T : class
        {
            Type type = typeof(T);
            if (Services.TryGetValue(type, out object service))
            {
                return (T)service;
            }

            return null;
        }

        public static void Unregister<T>() where T : class
        {
            Services.Remove(typeof(T));
        }

        public static void ClearAll()
        {
            Services.Clear();
        }
    }
}
