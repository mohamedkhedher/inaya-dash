import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col lg:flex-row bg-white overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen lg:h-full overflow-hidden bg-gray-50">
        <Header />
        <main className="flex-1 overflow-y-auto pt-16 lg:pt-0 bg-gray-50">
          <div className="container mx-auto px-4 py-6 lg:px-6 lg:py-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}



