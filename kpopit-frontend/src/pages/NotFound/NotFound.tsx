import PageShell from "../../components/Puff/PageShell";
import { PressLink } from "../../components/Puff/PressButton";
import PageMeta from "../../components/Seo/PageMeta";

/** Unknown paths and disabled features. */
export default function NotFound() {
    return (
        <>
            <PageMeta title="Page not found | KpopIt" description="This page doesn't exist on KpopIt." path="/404" noindex />
            <PageShell header={{ title: "404", subtitle: "This page got lost backstage..." }}>
                <div className="flex justify-center mt-8">
                    <PressLink to="/" variant="cta" size="lg">Play today's game</PressLink>
                </div>
            </PageShell>
        </>
    );
}
