import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  Users,
  Eye,
  MousePointerClick,
  Download,
  Filter,
} from "lucide-react";
import { KpiCard } from "@/components/KpiCard";

// Mock data para demonstração
const mockClients = [
  { id: 1, name: "Vida Card Tupanciretã", budget: 5000, spent: 3200, leads: 45 },
  { id: 2, name: "Vida Card Júlio de Castilhos", budget: 3000, spent: 2100, leads: 28 },
  { id: 3, name: "Vida Card Ijuí", budget: 4000, spent: 2800, leads: 38 },
];

const mockChartData = [
  { date: "01/01", spend: 1200, leads: 8, conversions: 2 },
  { date: "02/01", spend: 1400, leads: 12, conversions: 3 },
  { date: "03/01", spend: 1100, leads: 10, conversions: 2 },
  { date: "04/01", spend: 1600, leads: 15, conversions: 4 },
  { date: "05/01", spend: 1300, leads: 11, conversions: 3 },
  { date: "06/01", spend: 1800, leads: 18, conversions: 5 },
  { date: "07/01", spend: 1500, leads: 14, conversions: 4 },
];

const mockPieData = [
  { name: "Google Ads", value: 45, color: "#3b82f6" },
  { name: "Meta Ads", value: 35, color: "#8b5cf6" },
  { name: "Orgânico", value: 20, color: "#10b981" },
];

export default function DashboardAdvanced() {
  const [selectedClient, setSelectedClient] = useState(mockClients[0]);
  const [timeRange, setTimeRange] = useState("7d");
  const [clients, setClients] = useState(mockClients);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Buscar clientes da API
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const token = localStorage.getItem("tp_token");
        if (!token) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        setIsAuthenticated(true);
        const response = await fetch("/api/clients", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          const formattedClients = data.map((client: any) => ({
            id: client.id,
            name: client.name,
            budget: client.budget || 5000,
            spent: client.spent || 0,
            leads: client.leads || 0,
          }));
          setClients(formattedClients.length > 0 ? formattedClients : mockClients);
          setSelectedClient(formattedClients[0] || mockClients[0]);
        }
      } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        setClients(mockClients);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, []);

  useEffect(() => {
    document.title = "Tráfego Pro - Dashboard Avançado";
    return () => {
      document.title = "Tráfego Pro";
    };
  }, []);

        const totalSpend = clients.reduce((sum, c) => sum + c.spent, 0);
  const totalLeads = clients.reduce((sum, c) => sum + c.leads, 0);
  const avgCostPerLead = totalLeads > 0 ? (totalSpend / totalLeads).toFixed(2) : "0";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Você precisa estar logado para acessar o dashboard.</p>
          <a href="/login" className="text-blue-600 hover:underline mt-4 inline-block">Voltar para login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Avançado</h1>
            <p className="text-gray-600 mt-1">Análise detalhada de campanhas e performance</p>
          </div>

          <div className="flex gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
            </select>

            <Button className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KpiCard
            title="Gasto Total"
            value={`R$ ${totalSpend.toLocaleString("pt-BR")}`}
            icon={DollarSign}
            accent="blue"
            trend={{ value: 12, isPositive: true }}
          />
          <KpiCard
            title="Total de Leads"
            value={totalLeads}
            icon={Users}
            accent="green"
            trend={{ value: 8, isPositive: true }}
          />
          <KpiCard
            title="Custo por Lead"
            value={`R$ ${avgCostPerLead}`}
            icon={TrendingUp}
            accent="purple"
            trend={{ value: 3, isPositive: false }}
          />
          <KpiCard
            title="Impressões"
            value="125.4K"
            icon={Eye}
            accent="orange"
            trend={{ value: 5, isPositive: true }}
          />
        </div>

        {/* Client Selector */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Selecione um Cliente</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {clients.map((client) => (
              <Card
                key={client.id}
                className={`p-4 cursor-pointer transition-all ${
                  selectedClient.id === client.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setSelectedClient(client)}
              >
                <h3 className="font-semibold text-gray-900">{client.name}</h3>
                <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                  <div>
                    <p className="text-gray-600">Orçamento</p>
                    <p className="font-semibold text-gray-900">R$ {client.budget.toLocaleString("pt-BR")}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Gasto</p>
                    <p className="font-semibold text-gray-900">R$ {client.spent.toLocaleString("pt-BR")}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Leads</p>
                    <p className="font-semibold text-gray-900">{client.leads}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Line Chart - Spend & Leads */}
          <Card className="lg:col-span-2 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance ao Longo do Tempo</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="spend" stroke="#3b82f6" name="Gasto (R$)" />
                <Line type="monotone" dataKey="leads" stroke="#10b981" name="Leads" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Pie Chart - Channel Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por Canal</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mockPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {mockPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Bar Chart - Campaigns */}
        <Card className="p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance por Campanha</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="conversions" fill="#3b82f6" name="Conversões" />
              <Bar dataKey="leads" fill="#10b981" name="Leads" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Detailed Table */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalhes do Cliente: {selectedClient.name}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Métrica</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Valor</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">% do Orçamento</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-700">Orçamento Total</td>
                  <td className="text-right py-3 px-4 text-gray-900 font-semibold">
                    R$ {selectedClient.budget.toLocaleString("pt-BR")}
                  </td>
                  <td className="text-right py-3 px-4 text-gray-600">100%</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-700">Gasto</td>
                  <td className="text-right py-3 px-4 text-gray-900 font-semibold">
                    R$ {selectedClient.spent.toLocaleString("pt-BR")}
                  </td>
                  <td className="text-right py-3 px-4 text-gray-600">
                    {((selectedClient.spent / selectedClient.budget) * 100).toFixed(1)}%
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-700">Leads Gerados</td>
                  <td className="text-right py-3 px-4 text-gray-900 font-semibold">{selectedClient.leads}</td>
                  <td className="text-right py-3 px-4 text-gray-600">-</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-gray-700">Custo por Lead</td>
                  <td className="text-right py-3 px-4 text-gray-900 font-semibold">
                    R$ {(selectedClient.spent / selectedClient.leads).toFixed(2)}
                  </td>
                  <td className="text-right py-3 px-4 text-gray-600">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
