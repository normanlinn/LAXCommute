import { useCallback, useEffect, useRef, useState } from 'react';
import type { Prediction } from '../types';
import { haptic } from '../domain/haptics';
import { cancelPushAlert, startPushAlert } from '../services/pushAlerts';

// Alert a little before the live prediction so there is time to reach the curb.
export const ALERT_LEAD_MS = 2 * 60_000;

export interface BusAlert {
  vehicleID: number;
  stopID: number;
  busName: string;
}

export function canSetAlert(arrival: Prediction, now: number) {
  return (
    !arrival.scheduled &&
    Number.isSafeInteger(arrival.vehicleID) &&
    arrival.due - now > ALERT_LEAD_MS + 15_000
  );
}

async function notify(title: string, body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const options = { body, tag: 'laxcommute-bus-alert', icon: '/icons/commute-v5-192.png' };
  try {
    // Android only shows notifications through the service worker.
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) return await registration.showNotification(title, options);
    new Notification(title, options);
  } catch {
    /* The in-app banner still appears. */
  }
}

/**
 * One alert at a time, for one bus at one stop. It fires once when the live
 * prediction for that vehicle comes within ALERT_LEAD_MS, then clears itself.
 * The in-app timer covers an open app; when Web Push is available the Worker
 * also follows the bus and notifies a closed app. Leaving this screen keeps the
 * server alert, since the rider still wants it; cancelling or firing drops it.
 */
export function useBusAlert({
  routeID,
  stopID,
  predictions,
  message,
}: {
  routeID?: number;
  stopID?: number;
  predictions: Prediction[];
  message: (alert: BusAlert) => { title: string; body: string };
}) {
  const [alert, setAlert] = useState<BusAlert | null>(null);
  const [fired, setFired] = useState<BusAlert | null>(null);
  const messageRef = useRef(message);
  messageRef.current = message;
  const alertRef = useRef(alert);
  alertRef.current = alert;
  const pushRef = useRef<Promise<string | null> | null>(null);
  const dropPush = useCallback(() => {
    void pushRef.current?.then(cancelPushAlert);
    pushRef.current = null;
  }, []);

  // Changing stops makes the alert meaningless.
  useEffect(() => {
    if (alertRef.current && alertRef.current.stopID !== stopID) {
      dropPush();
      setAlert(null);
    }
  }, [stopID, dropPush]);

  const target = alert
    ? predictions.find((p) => !p.scheduled && p.vehicleID === alert.vehicleID)
    : undefined;
  const due = target?.due;

  const fire = useCallback(() => {
    const current = alertRef.current;
    if (!current) return;
    alertRef.current = null;
    // Already shown here; stop the server sending a duplicate.
    dropPush();
    setAlert(null);
    setFired(current);
    haptic('alert');
    const { title, body } = messageRef.current(current);
    void notify(title, body);
  }, [dropPush]);

  useEffect(() => {
    if (!alert || due === undefined) return;
    const wait = due - ALERT_LEAD_MS - Date.now();
    if (wait <= 0) {
      fire();
      return;
    }
    // A separate timer keeps running (throttled) while the tab is hidden.
    const timer = setTimeout(fire, wait);
    return () => clearTimeout(timer);
  }, [alert, due, fire]);

  const toggle = useCallback(
    async (arrival: Prediction) => {
      if (alert?.vehicleID === arrival.vehicleID) {
        dropPush();
        setAlert(null);
        haptic('tap');
        return;
      }
      if (stopID === undefined || arrival.vehicleID === undefined) return;
      dropPush();
      setFired(null);
      const next = { vehicleID: arrival.vehicleID, stopID, busName: arrival.busName };
      alertRef.current = next;
      setAlert(next);
      haptic('select');
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      } catch {
        /* Permission is optional; the in-app banner still works. */
      }
      // Still the chosen bus after the permission prompt? Then let the server follow it too.
      if (routeID === undefined || alertRef.current !== next) return;
      // dropPush() waits on this promise, so a cancel during the request still lands.
      pushRef.current = startPushAlert({ routeID, ...next, ...messageRef.current(next) });
    },
    [alert?.vehicleID, stopID, routeID, dropPush],
  );

  return { alert, fired, toggle, dismiss: () => setFired(null) };
}
