"use client";
import "leaflet/dist/leaflet.css";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { GeoPoint, TeacherSummary } from "@mastermoshai/core";
import { copy } from "@/lib/copy";
import { L } from "@/lib/l10n";
import { useLang } from "@/lib/lang-client";

export default function TutorMap({ center, teachers, radiusKm }: { center: GeoPoint; teachers: TeacherSummary[]; radiusKm: number }) {
  const lang = useLang();
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={12} className="h-full w-full" scrollWheelZoom={false}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Circle center={[center.lat, center.lng]} radius={radiusKm * 1000} pathOptions={{ color: "#163129", fillOpacity: 0.06 }} />
      <CircleMarker center={[center.lat, center.lng]} radius={7} pathOptions={{ color: "#c8372d", fillOpacity: 1 }}>
        <Popup>{copy(lang).search.you}</Popup>
      </CircleMarker>
      {teachers
        .filter((t) => t.area)
        .map((t) => (
          <CircleMarker key={t.id} center={[t.area!.point.lat, t.area!.point.lng]} radius={9} pathOptions={{ color: "#163129", fillOpacity: 0.85 }}>
            <Popup>
              <a href={`/teachers/${t.id}`}>
                <b>{L.name(t, lang)}</b>
              </a>
              <br />
              {L.uni(t.university, lang)} · {L.subjects(t.subjects, lang)}
            </Popup>
          </CircleMarker>
        ))}
    </MapContainer>
  );
}
