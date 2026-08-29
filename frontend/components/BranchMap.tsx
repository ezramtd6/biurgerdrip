"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { RestaurantInfo, Branch } from "@/types";

interface BranchMapProps {
  restaurant: RestaurantInfo | null;
  branches: Branch[];
}

export default function BranchMap({ restaurant, branches }: BranchMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, { fadeAnimation: false, zoomAnimation: false, markerZoomAnimation: false });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    const points: { lat: number; lng: number; label: string; branch: boolean }[] = [];

    if (restaurant?.latitude != null && restaurant.longitude != null) {
      points.push({
        lat: Number(restaurant.latitude),
        lng: Number(restaurant.longitude),
        label: restaurant.name || "Restaurant",
        branch: false,
      });
    }

    branches.forEach((b) => {
      if (!b.is_main && b.latitude != null && b.longitude != null) {
        points.push({
          lat: Number(b.latitude),
          lng: Number(b.longitude),
          label: `Branch ${b.id}`,
          branch: true,
        });
      }
    });

    const pin = L.divIcon({
      className: "",
      html: '<div style="width:18px;height:18px;border-radius:50%;background:#dc2626;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    const mainPin = L.divIcon({
      className: "",
      html: '<div style="width:24px;height:24px;border-radius:50%;background:#dc2626;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;line-height:1;font-weight:800">&#9733;</div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const userPin = L.divIcon({
      className: "",
      html: '<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    const directionsUrl = (lat: number, lng: number) =>
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    points.forEach((p) => {
      L.marker([p.lat, p.lng], { icon: p.branch ? pin : mainPin })
        .addTo(map)
        .bindPopup(
          `<strong>${p.label}</strong><br/>` +
            `<a href="${directionsUrl(p.lat, p.lng)}" target="_blank" rel="noopener noreferrer" ` +
            `style="display:inline-block;margin-top:6px;padding:6px 12px;border-radius:8px;background:#dc2626;color:#fff;text-decoration:none;font-size:12px;font-weight:600">Get Directions</a>`
        );
    });

    const showUserLocation = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!aliveRef.current) return;
          const { latitude, longitude } = pos.coords;
          L.marker([latitude, longitude], { icon: userPin })
            .addTo(map)
            .bindPopup("<strong>You are here</strong>");
          const latlngs = points.map((p) => L.latLng(p.lat, p.lng));
          latlngs.push(L.latLng(latitude, longitude));
          map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40], maxZoom: 15 });
        },
        () => {
          const el = container.querySelector(".branch-locate-btn");
          if (el instanceof HTMLElement) {
            el.style.opacity = "0.5";
          }
        }
      );
    };

    const LocateControl = L.Control.extend({
      onAdd: () => {
        const div = L.DomUtil.create("div", "leaflet-bar leaflet-control");
        const btn = L.DomUtil.create(
          "a",
          "branch-locate-btn",
          div
        ) as HTMLAnchorElement;
        btn.href = "#";
        btn.role = "button";
        btn.title = "Use my location";
        btn.innerHTML = "&#9673;";
        btn.style.fontSize = "18px";
        btn.style.lineHeight = "30px";
        btn.style.textAlign = "center";
        btn.style.width = "30px";
        btn.style.height = "30px";
        L.DomEvent.on(btn, "click", (e: Event) => {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          showUserLocation();
        });
        return div;
      },
    });
    map.addControl(new LocateControl({ position: "topleft" }));

    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), {
        padding: [40, 40],
        maxZoom: 15,
        animate: false,
      });
    } else {
      map.setView([8.9806, 38.7578], 12, { animate: false });
    }

    return () => {
      aliveRef.current = false;
      map.remove();
    };
  }, [restaurant, branches]);

  return <div ref={containerRef} className="w-full h-[400px] z-0" />;
}
