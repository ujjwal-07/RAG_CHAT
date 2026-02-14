import InteractiveBackground from "@/components/ui/interactive-background";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
            <InteractiveBackground />
            <div className="z-10 w-full max-w-md space-y-8 p-4">
                {children}
            </div>
        </div>
    )
}
