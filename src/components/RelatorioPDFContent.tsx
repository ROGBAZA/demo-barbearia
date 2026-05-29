import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Registrar fonte (opcional, pode usar padrão)
// Font.register({ family: 'Inter', src: '...' });

const styles = StyleSheet.create({
    page: {
        padding: 40,
        backgroundColor: '#FFFFFF',
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 20,
        borderBottom: 1,
        borderBottomColor: '#EAB308',
        paddingBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000000',
    },
    subtitle: {
        fontSize: 12,
        color: '#666666',
        marginTop: 5,
    },
    section: {
        marginTop: 20,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#EAB308',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 20,
    },
    statBox: {
        width: '25%',
        padding: 10,
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    statLabel: {
        fontSize: 10,
        color: '#999999',
    },
    statValue: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 5,
    },
    table: {
        width: '100%',
        marginTop: 10,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F9F9F9',
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        padding: 8,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        padding: 8,
    },
    cellHeader: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#333333',
    },
    cellText: {
        fontSize: 10,
        color: '#666666',
    },
    col1: { width: '40%' },
    col2: { width: '20%', textAlign: 'right' },
    col3: { width: '20%', textAlign: 'right' },
    col4: { width: '20%', textAlign: 'right' },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontSize: 8,
        color: '#CCCCCC',
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
        paddingTop: 10,
    },
});

interface RelatorioPDFProps {
    dataInicio: string;
    dataFim: string;
    receitaTotal: number;
    agendamentosCount: number;
    performanceBarbeiros: any[];
    resumoServicos: any[];
}

export const RelatorioPDFContent = ({
    dataInicio,
    dataFim,
    receitaTotal,
    agendamentosCount,
    performanceBarbeiros,
    resumoServicos
}: RelatorioPDFProps) => (
    <Document>
        <Page size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Relatório de Performance</Text>
                <Text style={styles.subtitle}>
                    Período: {dataInicio} até {dataFim}
                </Text>
            </View>

            {/* Resumo Geral */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Resumo Geral</Text>
                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>RECEITA TOTAL</Text>
                        <Text style={styles.statValue}>R$ {receitaTotal.toFixed(2)}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>AGENDAMENTOS</Text>
                        <Text style={styles.statValue}>{agendamentosCount}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>TICKET MÉDIO</Text>
                        <Text style={styles.statValue}>
                            R$ {agendamentosCount > 0 ? (receitaTotal / agendamentosCount).toFixed(2) : '0.00'}
                        </Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>PROFISSIONAIS</Text>
                        <Text style={styles.statValue}>{performanceBarbeiros.length}</Text>
                    </View>
                </View>
            </View>

            {/* Performance por Barbeiro */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Desempenho por Profissional</Text>
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.cellHeader, styles.col1]}>Barbeiro</Text>
                        <Text style={[styles.cellHeader, styles.col2]}>Atend.</Text>
                        <Text style={[styles.cellHeader, styles.col3]}>Receita</Text>
                        <Text style={[styles.cellHeader, styles.col4]}>Comissão</Text>
                    </View>
                    {performanceBarbeiros.map((b, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={[styles.cellText, styles.col1]}>{b.nome}</Text>
                            <Text style={[styles.cellText, styles.col2]}>{b.atendimentos}</Text>
                            <Text style={[styles.cellText, styles.col3]}>R$ {b.receita.toFixed(2)}</Text>
                            <Text style={[styles.cellText, styles.col4]}>R$ {b.comissao.toFixed(2)}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Top Serviços */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Serviços Mais Vendidos</Text>
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.cellHeader, styles.col1]}>Serviço</Text>
                        <Text style={[styles.cellHeader, styles.col2]}>Quant.</Text>
                    </View>
                    {resumoServicos.map((s, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={[styles.cellText, styles.col1]}>{s.nome}</Text>
                            <Text style={[styles.cellText, styles.col2]}>{s.quantidade}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Rodapé */}
            <Text style={styles.footer}>
                Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')} - Sistema de Gestão de Barbearias VIP
            </Text>
        </Page>
    </Document>
);
