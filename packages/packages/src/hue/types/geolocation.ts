import { createEnum, createStruct } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";

export const GeolocationDayType = createEnum("Day Type", (e) => [
  e.variant("normal_day"),
  e.variant("polar_day"),
  e.variant("polar_night"),
  e.variant("unknown"),
]);

export const GeolocationSunToday = createStruct("Sun Today", (s) => ({
  sunset_time: s.field("Sunset Time", t.string()),
  day_type: s.field("Day Type", t.enum(GeolocationDayType)),
}));

export const Geolocation = createStruct("Geolocation", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  is_configured: s.field("Is Configured", t.bool()),
  sun_today: s.field("Sun Today", t.option(t.struct(GeolocationSunToday))),
}));
