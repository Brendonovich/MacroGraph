import { clientOnly } from "@solidjs/start";
import { Suspense } from "solid-js";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

const Editor = clientOnly(() => import("../Editor"));

export default function () {
  return (
    <div class="flex flex-col w-full h-full">
      <header class="w-full flex flex-row justify-end border-b border-neutral-800">
        <div class="flex-1 p-2">
          <DropdownMenu>
            <DropdownMenuTrigger as={Button}>Project</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onSelect={() => {
                  console.log("Exporting...");
                }}
              >
                <span>Export</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  console.log("Copying...");
                }}
              >
                <span>Copy</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div class="p-2">
          <Button>Connections</Button>
        </div>
      </header>

      <div class="flex-1 overflow-hidden">
        <Suspense>
          <Editor />
        </Suspense>
      </div>
    </div>
  );
}
