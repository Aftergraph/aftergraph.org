import SwiftUI

@main
struct AftergraphApp: App {
    var body: some Scene {
        WindowGroup { RootView().preferredColorScheme(.dark) }
    }
}

struct RootView: View {
    var body: some View {
        TabView {
            DashboardView().tabItem { Label("War Room", systemImage: "waveform.path.ecg") }
            WorkView().tabItem { Label("Work", systemImage: "checklist") }
            AgentsView().tabItem { Label("Agents", systemImage: "cpu") }
            NeedsYouView().tabItem { Label("Needs You", systemImage: "exclamationmark.bubble") }
            SettingsView().tabItem { Label("Settings", systemImage: "gearshape") }
        }
        .tint(.white)
    }
}

private struct Page<Content: View>: View {
    let title: String
    let content: Content
    init(_ title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) { content }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .background(Color.black)
            .navigationTitle(title)
        }
    }
}

private struct Metric: View {
    let value: String
    let label: String
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(value).font(.system(size: 28, weight: .bold, design: .rounded))
            Text(label).font(.caption).foregroundStyle(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18))
    }
}

struct DashboardView: View {
    var body: some View {
        Page("War Room") {
            Text("Aftergraph").font(.system(size: 44, weight: .bold, design: .rounded))
            Text("Governed execution. Observable state. Verifiable outcomes.")
                .foregroundStyle(.secondary)
            HStack { Metric(value: "4", label: "Active agents"); Metric(value: "2", label: "Needs you") }
            HStack { Metric(value: "7", label: "Open missions"); Metric(value: "12", label: "Evidence items") }
            GroupBox("System state") {
                VStack(alignment: .leading, spacing: 10) {
                    Label("Runtime client ready", systemImage: "checkmark.circle.fill")
                    Label("Authority remains server-side", systemImage: "shield.checkered")
                    Label("Evidence projection enabled", systemImage: "doc.text.magnifyingglass")
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}

struct WorkView: View {
    var body: some View {
        Page("Work") {
            ForEach(["Ship iOS distribution", "Verify governed build", "Reconcile runtime state"], id: \.self) { item in
                HStack {
                    Image(systemName: "circle")
                    VStack(alignment: .leading) {
                        Text(item).font(.headline)
                        Text("Mission · governed").font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                }
                .padding()
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
            }
        }
    }
}

struct AgentsView: View {
    private let agents = [("Friday","Active","sparkles"),("Hermes","Running","bolt.fill"),("Sentinel","Watching","shield.fill"),("Builder","Ready","hammer.fill")]
    var body: some View {
        Page("Agents") {
            ForEach(agents, id: \.0) { agent in
                HStack(spacing: 14) {
                    Image(systemName: agent.2).frame(width: 34, height: 34).background(.white.opacity(0.08), in: Circle())
                    VStack(alignment: .leading) { Text(agent.0).font(.headline); Text(agent.1).font(.caption).foregroundStyle(.secondary) }
                    Spacer(); Circle().fill(.green).frame(width: 8, height: 8)
                }
                .padding()
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
            }
        }
    }
}

struct NeedsYouView: View {
    var body: some View {
        Page("Needs You") {
            Text("Authority requests").font(.title2.bold())
            Text("No action is executed locally without server authorization.")
                .foregroundStyle(.secondary)
            GroupBox("Distribution") {
                LabeledContent("iOS client", value: "Ready")
                LabeledContent("Authority boundary", value: "Server-side")
            }
        }
    }
}

struct SettingsView: View {
    @State private var endpoint = "https://api.aftergraph.org"
    var body: some View {
        Page("Settings") {
            Text("Gateway").font(.headline)
            TextField("Endpoint", text: $endpoint)
                .textInputAutocapitalization(.never)
                .keyboardType(.URL)
                .padding()
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 14))
            LabeledContent("Bundle ID", value: "org.aftergraph.ios")
            LabeledContent("Distribution", value: "Alternative iOS distribution")
            LabeledContent("Authority", value: "Server-side")
        }
    }
}
