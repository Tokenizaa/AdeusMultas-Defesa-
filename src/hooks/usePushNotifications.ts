import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../core/auth/AuthContext';

export interface AppNotificationItem {
  id: string;
  caseId?: string;
  userId?: string;
  userEmail?: string;
  title: string;
  body: string;
  url: string;
  status: string;
  read: boolean;
  createdAt: string;
  type: 'case_status' | 'prazo_alerta' | 'system' | 'marketing';
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<AppNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Check support and permission on mount
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator;

    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      setIsSubscribed(Notification.permission === 'granted');
    }
  }, []);

  // Fetch notification history
  const fetchNotifications = useCallback(async () => {
    try {
      const email = user?.email || 'fariasnetto01@gmail.com';
      const res = await fetch(`/api/notifications/history?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        const list: AppNotificationItem[] = data.notifications || [];
        setNotifications(list);
        setUnreadCount(list.filter((n) => !n.read).length);
      }
    } catch (err) {
      console.warn('[Push Hook] Erro ao carregar histórico:', err);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  /**
   * Request browser permission and register subscription
   */
  const requestPermissionAndSubscribe = useCallback(async () => {
    if (!isSupported) {
      console.warn('[Push Hook] Notificações push não suportadas neste navegador.');
      return false;
    }

    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        setIsSubscribed(true);

        const registration = await navigator.serviceWorker.ready;

        // Generate or get push subscription
        let subscriptionEndpoint = `local_device_${Date.now()}`;
        try {
          const sub = await registration.pushManager.getSubscription();
          if (sub) {
            subscriptionEndpoint = sub.endpoint;
          }
        } catch {
          // Fallback to local token
        }

        // Register with server
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subscriptionEndpoint,
            userId: user?.id,
            userEmail: user?.email,
          }),
        });

        // Show welcome confirmation via Service Worker
        triggerLocalNotification(
          '🔔 Notificações DefesAi Ativadas!',
          'Você receberá alertas em tempo real sobre mudanças no status dos seus recursos e prazos periciais.',
          '/cases'
        );

        fetchNotifications();
        return true;
      }
      return false;
    } catch (err) {
      console.error('[Push Hook] Erro ao solicitar permissão de notificações:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, user?.id, user?.email, fetchNotifications]);

  /**
   * Dispatches local notification via Service Worker
   */
  const triggerLocalNotification = useCallback(
    async (title: string, body: string, url = '/', caseId?: string) => {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

      try {
        const registration = await navigator.serviceWorker.ready;

        if (registration && registration.showNotification && Notification.permission === 'granted') {
          await registration.showNotification(title, {
            body,
            icon: '/icons/icon-192.svg',
            badge: '/favicon.svg',
            tag: `defesai-${caseId || Date.now()}`,
            data: { url, caseId },
          } as any);
        } else if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            title,
            body,
            url,
            caseId,
          });
        }
      } catch (err) {
        console.warn('[Push Hook] Falha ao disparar notificação local:', err);
      }
    },
    []
  );

  /**
   * Send test notification
   */
  const sendTestNotification = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Request via Backend
      const res = await fetch('/api/notifications/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user?.email || 'fariasnetto01@gmail.com',
          title: '⚖️ Alerta de Julgamento: Recurso Deferido!',
          body: 'O DETRAN-SP acolheu a tese pericial de nulidade do radar. Multa cancelada com sucesso!',
        }),
      });

      // 2. Dispatch immediately via Service Worker
      await triggerLocalNotification(
        '⚖️ Alerta de Julgamento: Recurso Deferido!',
        'O DETRAN-SP acolheu a tese pericial de nulidade do radar. Multa cancelada com sucesso!',
        '/cases/case_demo_745',
        'case_demo_745'
      );

      fetchNotifications();
      return true;
    } catch (err) {
      console.error('[Push Hook] Erro ao enviar teste:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.email, triggerLocalNotification, fetchNotifications]);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user?.email }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[Push Hook] Erro ao marcar como lidas:', err);
    }
  }, [user?.email]);

  return {
    permission,
    isSubscribed,
    isSupported,
    loading,
    notifications,
    unreadCount,
    requestPermissionAndSubscribe,
    triggerLocalNotification,
    sendTestNotification,
    markAllAsRead,
    fetchNotifications,
  };
}
