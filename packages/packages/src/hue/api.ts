import { EventsMap, Package } from "@macrograph/runtime";
import { Ctx } from "./ctx";
import { InferEnum, Maybe, t } from "@macrograph/typesystem";
import {
  AlertEffectType,
  AlertFeature,
  ColorFeature,
  ColorFeatureBase,
  ColorGamut,
  ColorPoint,
  ColorTemperatureFeature,
  ColorTemperatureFeatureBase,
  DimmingFeature,
  DimmingFeatureBase,
  DynamicStatus,
  DynamicsFeature,
  EffectStatus,
  EffectsFeature,
  GamutType,
  GradientFeature,
  GradientMode,
  GradientPoint,
  LIGHT_SCHEMA,
  Light,
  LightMode,
  MirekSchema,
  OnFeature,
  PowerUpFeature,
  PowerUpFeatureColorMode,
  PowerUpFeatureColorState,
  PowerUpFeatureDimmingMode,
  PowerUpFeatureDimmingState,
  PowerUpFeatureOnMode,
  PowerUpFeatureOnState,
  PowerUpPreset,
  ResourceIdentifier,
  ResourceTypes,
  Signal,
  SignalingFeature,
  SignalingFeatureStatus,
  TimedEffectStatus,
  TimedEffectsFeature,
} from "./types";
import { TEMP_GET_LIGHTS } from "./temp";
import { z } from "zod";
import { value } from "@modular-forms/solid";

export function postRequest(url: string, json: any) {
  const timeoutTime = 500;
  return new Promise<any>(function (resolve, reject) {
    const controller = new AbortController();
    setTimeout(function () {
      reject(new Error("AbortTimeout"));
      controller.abort();
    }, timeoutTime);
    fetch("http://" + url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(json),
    })
      .then((response) => response.json())
      .then((data) => resolve(data))
      .catch((err) => reject(err));
  });
}

export function register(pkg: Package<EventsMap>, ctx: Ctx) {
  pkg.createNonEventSchema({
    name: "Get Lights",
    variant: "Exec",
    generateIO: ({ io }) => ({
      out: io.dataOutput({
        id: "lights",
        name: "Light",
        type: t.list(t.struct(Light)),
      }),
      in: io.dataInput({
        id: "in",
        name: "Type",
        type: t.enum(ResourceTypes),
      }),
      test: io.dataOutput({
        id: "test",
        type: t.enum(ResourceTypes),
      }),
    }),
    async run({ ctx, io }) {
      let data = z.array(LIGHT_SCHEMA).parse(TEMP_GET_LIGHTS.data);
      // let data = TEMP_GET_LIGHTS.data;

      const lights = data.map((light) =>
        Light.create({
          id: light.id,
          id_v1: Maybe(light.id_v1),
          owner: ResourceIdentifier.create({
            rid: light.owner.rid,
            rtype: ResourceTypes.variant(light.owner.rtype),
          }),
          on: OnFeature.create({ on: light.on.on }),
          mode: LightMode.variant(light.mode),
          dimming: Maybe(light.dimming).andThen((dimming) =>
            Maybe(
              DimmingFeature.create({
                min_dim_level: Maybe(dimming.min_dim_level),
                brightness: dimming.brightness,
              })
            )
          ),
          color_temperature: Maybe(light.color_temperature).andThen(
            (color_temp) =>
              Maybe(
                ColorTemperatureFeature.create({
                  mirek_schema: MirekSchema.create({
                    mirek_minimum: color_temp.mirek_schema.mirek_minimum,
                    mirek_maximum: color_temp.mirek_schema.mirek_maximum,
                  }),
                  mirek: Maybe(color_temp.mirek),
                  mirek_valid: color_temp.mirek_valid,
                })
              )
          ),
          color: Maybe(light.color).andThen((color) =>
            Maybe(
              ColorFeature.create({
                gamut_type: GamutType.variant(color.gamut_type),
                gamut: Maybe(color.gamut).andThen((gamut) =>
                  Maybe(
                    ColorGamut.create({
                      red: ColorPoint.create({
                        x: gamut.red.x,
                        y: gamut.red.y,
                      }),
                      blue: ColorPoint.create({
                        x: gamut.blue.x,
                        y: gamut.blue.y,
                      }),
                      green: ColorPoint.create({
                        x: gamut.green.x,
                        y: gamut.green.y,
                      }),
                    })
                  )
                ),
                xy: ColorPoint.create({
                  x: color.xy.x,
                  y: color.xy.y,
                }),
              })
            )
          ),
          dynamics: Maybe(light.dynamics).andThen((dynamics) =>
            Maybe(
              DynamicsFeature.create({
                speed: dynamics.speed,
                speed_valid: dynamics.speed_valid,
                status: DynamicStatus.variant(dynamics.status),
                status_values: dynamics.status_values.map((value) =>
                  DynamicStatus.variant(value)
                ),
              })
            )
          ),
          alert: Maybe(light.alert).andThen((alert) =>
            Maybe(
              AlertFeature.create({
                action_values: alert.action_values.map((value) =>
                  AlertEffectType.variant(value)
                ),
              })
            )
          ),
          signaling: Maybe(light.signaling).andThen((v) =>
            Maybe(
              SignalingFeature.create({
                status: Maybe(v.status).andThen((status) =>
                  Maybe(
                    SignalingFeatureStatus.create({
                      signal: Signal.variant(status.signal),
                      estimated_end: Maybe(status.estimated_end),
                      colors: Maybe(status.colors).andThen((colors) =>
                        Maybe(
                          colors.map((color) =>
                            ColorFeatureBase.create({
                              xy: ColorPoint.create({
                                x: color.xy.x,
                                y: color.xy.y,
                              }),
                            })
                          )
                        )
                      ),
                    })
                  )
                ),
                signal_values: v.signal_values.map((value) =>
                  Signal.variant(value)
                ),
              })
            )
          ),
          gradient: Maybe(light.gradient).andThen((v) =>
            Maybe(
              GradientFeature.create({
                points: v.points.map((point) =>
                  GradientPoint.create({
                    color: ColorFeatureBase.create({
                      xy: ColorPoint.create({
                        x: point.color.xy.x,
                        y: point.color.xy.y,
                      }),
                    }),
                  })
                ),
                points_capable: v.points_capable,
                mode: GradientMode.variant(Maybe(light.gradient).unwrap().mode),
                mode_values: v.mode_values.map((value) =>
                  GradientMode.variant(value)
                ),
                pixel_count: Maybe(v.pixel_count),
              })
            )
          ),
          effects: Maybe(light.effects).andThen((v) =>
            Maybe(
              EffectsFeature.create({
                status: EffectStatus.variant(v.status),
                effect_values: v.effect_values.map((value) =>
                  EffectStatus.variant(value)
                ),
                status_values: v.status_values.map((value) =>
                  EffectStatus.variant(value)
                ),
              })
            )
          ),
          timed_effects: Maybe(light.timed_effects).andThen((v) =>
            Maybe(
              TimedEffectsFeature.create({
                status: TimedEffectStatus.variant(v.status),
                effect: Maybe(v.effect).andThen((effect) =>
                  Maybe(TimedEffectStatus.variant(effect))
                ),
                status_values: v.status_values.map((value) =>
                  TimedEffectStatus.variant(value)
                ),
                effect_values: v.effect_values.map((value) =>
                  TimedEffectStatus.variant(
                    value as InferEnum<typeof TimedEffectStatus>["variant"]
                  )
                ),
                duration: Maybe(v.duration),
              })
            )
          ),
          powerup: Maybe(light.powerup).andThen((v) =>
            Maybe(
              PowerUpFeature.create({
                preset: PowerUpPreset.variant(
                  v.preset as InferEnum<typeof PowerUpPreset>["variant"]
                ),
                configured: v.configured,
                on: PowerUpFeatureOnState.create({
                  mode: PowerUpFeatureOnMode.variant(
                    v.on.mode as InferEnum<
                      typeof PowerUpFeatureOnMode
                    >["variant"]
                  ),
                  on: Maybe(v.on.on).andThen((o) =>
                    Maybe(
                      OnFeature.create({
                        on: o.on,
                      })
                    )
                  ),
                }),
                dimming: Maybe(v.dimming).andThen((dimming) =>
                  Maybe(
                    PowerUpFeatureDimmingState.create({
                      mode: PowerUpFeatureDimmingMode.variant(
                        dimming.mode as InferEnum<
                          typeof PowerUpFeatureDimmingMode
                        >["variant"]
                      ),
                      dimming: Maybe(dimming.dimming).andThen((dd) =>
                        Maybe(
                          DimmingFeatureBase.create({
                            brightness: dd.brightness,
                          })
                        )
                      ),
                    })
                  )
                ),
                color: Maybe(v.color).andThen((color) =>
                  Maybe(
                    PowerUpFeatureColorState.create({
                      mode: PowerUpFeatureColorMode.variant(
                        color.mode as InferEnum<
                          typeof PowerUpFeatureColorMode
                        >["variant"]
                      ),
                      color_temperature: Maybe(color.color_temperature).andThen(
                        (ct) =>
                          Maybe(
                            ColorTemperatureFeatureBase.create({
                              mirek: Maybe(ct.mirek),
                            })
                          )
                      ),
                      color: Maybe(color.color).andThen((cc) =>
                        Maybe(
                          ColorFeatureBase.create({
                            xy: ColorPoint.create({
                              x: cc.xy.x,
                              y: cc.xy.y,
                            }),
                          })
                        )
                      ),
                    })
                  )
                ),
              })
            )
          ),
          type: ResourceTypes.variant("light"),
        })
      );

      ctx.setOutput(io.out, lights);
      ctx.setOutput(io.test, ResourceTypes.variant("light"));
    },
  });
}
