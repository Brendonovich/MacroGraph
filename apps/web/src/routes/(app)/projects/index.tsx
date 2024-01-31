import { action, cache, createAsync } from "@solidjs/router";
import { eq, sql } from "drizzle-orm";
import { For, Show, Suspense } from "solid-js";

import { ensureAuthenticated } from "~/api";
import { Button } from "~/components/ui/button";
import { db } from "~/drizzle";
import { projects } from "~/drizzle/schema";

const getProjects = cache(async () => {
  "use server";

  const { user } = await ensureAuthenticated();

  return await db.query.projects.findMany({
    where: eq(projects.ownerId, user.id),
  });
}, "projects");

const createNewProject = action(async () => {
  "use server";

  const { user } = await ensureAuthenticated();

  // await db.insert(projects).values({
  //   name: "New Project",
  //   ownerId: user.id,
  // });
});

export default function () {
  const projects = createAsync(getProjects);

  return (
    <div class="space-y-4">
      <header class="flex flex-row justify-between items-start">
        <div class="space-y-1.5">
          <h1 class="text-3xl font-medium">Projects</h1>
          <p class="text-sm text-neutral-400">
            Manage projects you've saved to your account.
          </p>
        </div>
        <Button onClick={() => {}}>Create Project</Button>
        {/* <AddCredentialButton /> */}
      </header>
      <Suspense>
        <Show when={projects()?.length !== 0}>
          <For each={projects()}>
            {(project) => (
              <li>
                <a class="p-4 flex flex-row items-center space-x-4 text-base">
                  <div>
                    <h3 class="font-medium">{project.name}</h3>
                    <span class=" text-sm text-neutral-400 p-1 bg-neutral-900 uppercase">
                      {project.clientType === 0 ? "web" : "desktop"}
                    </span>
                  </div>
                </a>
              </li>
            )}
          </For>
        </Show>
      </Suspense>
    </div>
  );
}
