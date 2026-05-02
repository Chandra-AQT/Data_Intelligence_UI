import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/batch")({
    beforeLoad: () => { throw redirect({ to: "/extract" }); },
    component: () => null,
});
