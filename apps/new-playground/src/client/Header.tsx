import { A } from "@solidjs/router";
import { ClientListDropdown } from "./Presence/ClientListDropdown";

export function Header() {
  return (
    <div class="flex flex-row gap-2 px-2 items-center h-10 bg-gray-2 z-10">
      <A
        class="p-1 px-2 rounded hover:bg-gray-3"
        inactiveClass="bg-gray-2"
        activeClass="bg-gray-3"
        href="/packages"
      >
        Packages
      </A>
      <A
        class="p-1 px-2 rounded hover:bg-gray-3"
        inactiveClass="bg-gray-2"
        activeClass="bg-gray-3"
        href="/"
        end
      >
        Graph
      </A>
      <div class="flex-1" />
      <ClientListDropdown />
    </div>
  );
}
