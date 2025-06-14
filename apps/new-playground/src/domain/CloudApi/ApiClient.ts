import {
  FetchHttpClient,
  HttpApiClient,
  HttpClient,
  HttpClientRequest,
} from "@effect/platform";
import { Api } from "@macrograph/web-api";
import { Effect } from "effect";

const API_BEARER_TOKEN = "";
const API_URL = "https://www.macrograph.app";

export class CloudAPIClient extends Effect.Service<CloudAPIClient>()(
  "CloudAPIClient",
  {
    effect: Effect.gen(function* () {
      const apiClient = yield* HttpApiClient.make(Api, {
        baseUrl: API_URL,
        transformClient: HttpClient.mapRequest(
          HttpClientRequest.bearerToken(API_BEARER_TOKEN),
        ),
      });

      return apiClient;
    }),
    dependencies: [FetchHttpClient.layer],
  },
) {}
