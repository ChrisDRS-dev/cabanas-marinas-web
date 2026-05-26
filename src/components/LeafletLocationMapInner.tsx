"use client";

import type { Icon, DivIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, ZoomControl } from "react-leaflet";

type LeafletLocationMapInnerProps = {
  latitude: number;
  longitude: number;
  title: string;
  markerIcon: Icon | DivIcon;
  theme?: "light" | "dark";
};

export default function LeafletLocationMapInner({
  latitude,
  longitude,
  title,
  markerIcon,
  theme = "dark",
}: LeafletLocationMapInnerProps) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={14}
      scrollWheelZoom={false}
      zoomControl={false}
      className="h-full w-full"
    >
      <ZoomControl position="bottomright" />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={
          theme === "dark"
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        }
      />
      <Marker position={[latitude, longitude]} icon={markerIcon}>
        <Popup>{title}</Popup>
      </Marker>
    </MapContainer>
  );
}
