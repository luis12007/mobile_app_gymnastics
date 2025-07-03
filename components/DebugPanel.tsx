import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface LogEntry {
  id: number;
  timestamp: string;
  level: string;
  message: string;
}

interface DebugPanelProps {
  // Toggle state
  showDebugPanel: boolean;
  setShowDebugPanel: (show: boolean) => void;
  
  // Navigation info
  currentPath: string;
  
  // Competition Info (from useLocalSearchParams)
  competenceId: string | string[];
  event: string | string[];
  number: string | string[];
  participants: string | string[];
  folderId: string | string[];
  discipline: boolean;
  
  // Gymnast Info
  gymnastid: number;
  gymnastName: string;
  gymnastNoc: string;
  gymnastBib: string;
  gymnastEvent: string;
  
  // Rate Info
  rateid: number;
  totalElements: number;
  difficultyValues: number;
  elementGroupsTotal: number;
  cv: number;
  sv: number;
  nd: number;
  stickbonus: boolean;
  
  // Scores
  execution: number;
  eScore: number;
  myScore: number;
  score: number;
  delt: number;
  ded: number;
  percentage: number;
  
  // Element Counts
  elementCounts: { [key: string]: { value: number; selected: boolean } };
  
  // Element Groups
  elementGroupValues: { [key: string]: number };
  
  // Competition Deductions
  d: number;
  e: number;
  ndcomp: number;
  sb: boolean;
  
  // Save Information
  saveAttempts: number;
  lastSaveTime: Date | null;
  saveWarning: string;
  
  // Modal States
  showCvModal: boolean;
  showNdModal: boolean;
  showExecutionModal: boolean;
  showCommentsModal: boolean;
  showDModal: boolean;
  showEModal: boolean;
  showNdCompModal: boolean;
  showSvModal?: boolean;
  
  // Vault Specific Properties (for jump/vault screens)
  vaultnumber?: string;
  vaultDescription?: string;
  startValue?: number;
  gender?: boolean;
  showmodalmag?: boolean;
  showmodalwag?: boolean;
  
  // Comments
  comments: string;
  
  // Logs
  logs: LogEntry[];
  clearLogs: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({
  showDebugPanel,
  setShowDebugPanel,
  currentPath,
  competenceId,
  event,
  number,
  participants,
  folderId,
  discipline,
  gymnastid,
  gymnastName,
  gymnastNoc,
  gymnastBib,
  gymnastEvent,
  rateid,
  totalElements,
  difficultyValues,
  elementGroupsTotal,
  cv,
  sv,
  nd,
  stickbonus,
  execution,
  eScore,
  myScore,
  score,
  delt,
  ded,
  percentage,
  elementCounts,
  elementGroupValues,
  d,
  e,
  ndcomp,
  sb,
  saveAttempts,
  lastSaveTime,
  saveWarning,
  showCvModal,
  showNdModal,
  showExecutionModal,
  showCommentsModal,
  showDModal,
  showEModal,
  showNdCompModal,
  showSvModal,
  vaultnumber,
  vaultDescription,
  startValue,
  gender,
  showmodalmag,
  showmodalwag,
  comments,
  logs,
  clearLogs,
}) => {
  const getLogLevelStyle = (level: string) => {
    switch (level) {
      case 'LOG':
        return styles.logLevelLOG;
      case 'ERROR':
        return styles.logLevelERROR;
      case 'WARN':
        return styles.logLevelWARN;
      case 'INFO':
        return styles.logLevelINFO;
      default:
        return {};
    }
  };

  const generateDebugReport = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const currentDate = new Date().toLocaleString();
    
    // Generate full path with parameters
    const fullPath = `${currentPath}?competenceId=${Array.isArray(competenceId) ? competenceId.join(',') : competenceId}&event=${Array.isArray(event) ? event.join(',') : event}&number=${Array.isArray(number) ? number.join(',') : number}&participants=${Array.isArray(participants) ? participants.join(',') : participants}&folderId=${Array.isArray(folderId) ? folderId.join(',') : folderId}&discipline=${discipline}&gymnast=${gymnastid}`;
    
    const report = `GYM JUDGE - DEBUG REPORT
================================================================================
Generated on: ${currentDate}
Platform: ${Platform.OS}
Report ID: ${timestamp}
================================================================================

NAVIGATION INFO:
- Current Path: ${currentPath}
- Full Path with Parameters: ${fullPath}
- URL Parameters:
  * competenceId: ${Array.isArray(competenceId) ? competenceId.join(', ') : competenceId}
  * event: ${Array.isArray(event) ? event.join(', ') : event}
  * number: ${Array.isArray(number) ? number.join(', ') : number}
  * participants: ${Array.isArray(participants) ? participants.join(', ') : participants}
  * folderId: ${Array.isArray(folderId) ? folderId.join(', ') : folderId}
  * discipline: ${discipline}
  * gymnast: ${gymnastid}

COMPETITION INFO:
- Competition ID: ${Array.isArray(competenceId) ? competenceId.join(', ') : competenceId}
- Event: ${Array.isArray(event) ? event.join(', ') : event}
- Participant: ${Array.isArray(number) ? number.join(', ') : number}/${Array.isArray(participants) ? participants.join(', ') : participants}
- Folder ID: ${Array.isArray(folderId) ? folderId.join(', ') : folderId}
- Discipline: ${discipline ? "WAG (Women's Artistic Gymnastics)" : "MAG (Men's Artistic Gymnastics)"}

GYMNAST INFO:
- ID: ${gymnastid}
- Name: ${gymnastName}
- NOC: ${gymnastNoc}
- BIB: ${gymnastBib}
- Event: ${gymnastEvent}

${(vaultnumber || vaultDescription || startValue !== undefined || gender !== undefined) ? `VAULT INFO:
- Vault Number: ${vaultnumber || "N/A"}
- Description: ${vaultDescription || "N/A"}
- Start Value: ${startValue !== undefined ? startValue : "N/A"}
- Gender: ${gender !== undefined ? (gender ? "MAG" : "WAG") : "N/A"}
` : ''}

RATE INFO:
- Rate ID: ${rateid}
- Total Elements: ${totalElements}
- Difficulty Values: ${difficultyValues}
- Element Groups Total: ${elementGroupsTotal}
- CV (Connection Value): ${cv}
- SV (Start Value): ${sv}
- ND (Neutral Deduction): ${nd}
- Stick Bonus: ${stickbonus ? "Yes" : "No"}

SCORES:
- Execution: ${execution}
- E-Score: ${eScore}
- My Score: ${myScore}
- Competition Score: ${score}
- Delta: ${delt}
- Deduction: ${ded}
- Percentage: ${percentage}

ELEMENT COUNTS:
${Object.entries(elementCounts).map(([key, value]) => 
  `- ${key}: ${value.value} (Selected: ${value.selected ? "Yes" : "No"})`
).join('\n')}

ELEMENT GROUPS:
${Object.entries(elementGroupValues).map(([key, value]) => 
  `- Group ${key}: ${value}`
).join('\n')}

COMPETITION DEDUCTIONS:
- D (Difficulty): ${d}
- E (Execution): ${e}
- ND Comp (Neutral Deduction Competition): ${ndcomp}
- SB (Stick Bonus): ${sb ? "Yes" : "No"}

SAVE STATUS:
- Save Attempts: ${saveAttempts}
- Last Save: ${lastSaveTime ? lastSaveTime.toLocaleString() : "Never"}
- Current Warning: ${saveWarning || "None"}

MODAL STATES:
- CV Modal: ${showCvModal ? "Open" : "Closed"}
- ND Modal: ${showNdModal ? "Open" : "Closed"}
- Execution Modal: ${showExecutionModal ? "Open" : "Closed"}
- Comments Modal: ${showCommentsModal ? "Open" : "Closed"}
- D Modal: ${showDModal ? "Open" : "Closed"}
- E Modal: ${showEModal ? "Open" : "Closed"}
- ND Comp Modal: ${showNdCompModal ? "Open" : "Closed"}${showSvModal !== undefined ? `
- SV Modal: ${showSvModal ? "Open" : "Closed"}` : ''}${showmodalmag !== undefined ? `
- MAG Vault Modal: ${showmodalmag ? "Open" : "Closed"}` : ''}${showmodalwag !== undefined ? `
- WAG Vault Modal: ${showmodalwag ? "Open" : "Closed"}` : ''}

COMMENTS:
"${comments}" (Length: ${comments.length} characters)

APPLICATION LOGS (${logs.length} entries):
${logs.length === 0 ? "No logs captured yet..." : 
  logs.map((log, index) => 
    `${String(index + 1).padStart(3, ' ')}. [${log.level.padEnd(5)}] ${log.timestamp}: ${log.message}`
  ).join('\n')
}

NAVIGATION REFERENCES:
- Back Navigation: /main-floor -> Previous gymnast in sequence
- Forward Navigation: /main-floor -> Next gymnast in sequence
- Main Table Navigation: /final-table?competenceId=${Array.isArray(competenceId) ? competenceId.join(',') : competenceId}&gymnastId=${discipline}&event=${Array.isArray(event) ? event.join(',') : event}&discipline=${discipline}&gymnast=${gymnastid}&number=${Array.isArray(number) ? number.join(',') : number}&participants=${Array.isArray(participants) ? participants.join(',') : participants}&folderId=${Array.isArray(folderId) ? folderId.join(',') : folderId}
- Start List Navigation: /start-gudging?id=${Array.isArray(competenceId) ? competenceId.join(',') : competenceId}&discipline=${discipline}&participants=${Array.isArray(participants) ? participants.join(',') : participants}&number=${Array.isArray(number) ? number.join(',') : number}&gymnast=${gymnastid}&folderId=${Array.isArray(folderId) ? folderId.join(',') : folderId}

================================================================================
End of Debug Report - Generated by Gym Judge App
================================================================================`;

    return report;
  };

  const downloadDebugReport = async () => {
    try {
      const report = generateDebugReport();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `gym_judge_debug_report_${timestamp}.txt`;
      
      if (Platform.OS === 'web') {
        // For web platform
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        Alert.alert(
          "Report Downloaded",
          "Debug report has been downloaded successfully!",
          [{ text: "OK" }]
        );
      } else {
        // For mobile platforms
        const fileUri = FileSystem.documentDirectory + fileName;
        
        await FileSystem.writeAsStringAsync(fileUri, report, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/plain',
            dialogTitle: 'Save Debug Report',
          });
        } else {
          Alert.alert(
            "Report Generated",
            `Debug report saved to: ${fileUri}`,
            [{ text: "OK" }]
          );
        }
      }
    } catch (error) {
      console.error('Error generating debug report:', error);
      Alert.alert(
        "Error",
        "Failed to generate debug report. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  return (
    <>
      {/* Debug Panel Toggle Button */}
      <View style={styles.debugToggleContainer}>
        <TouchableOpacity
          style={styles.debugToggleButton}
          onPress={() => setShowDebugPanel(!showDebugPanel)}
        >
          <Text style={styles.debugToggleText}>
            {showDebugPanel ? "Hide Debug Info" : "Show Debug Info"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Debug Information Panel */}
      {showDebugPanel && (
        <View style={styles.debugPanel}>
          <View style={styles.debugHeader}>
            <Text style={styles.debugTitle}>🔧 Debug Information</Text>
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={downloadDebugReport}
            >
              <Text style={styles.downloadButtonText}>📥 Download Report</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.debugScrollView}>
            {/* Navigation Info */}
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>Navigation Info:</Text>
              <Text style={styles.debugText}>Current Path: {currentPath}</Text>
              <Text style={styles.debugText}>Full URL: {currentPath}?competenceId={Array.isArray(competenceId) ? competenceId.join(',') : competenceId}&event={Array.isArray(event) ? event.join(',') : event}&number={Array.isArray(number) ? number.join(',') : number}&participants={Array.isArray(participants) ? participants.join(',') : participants}&folderId={Array.isArray(folderId) ? folderId.join(',') : folderId}&discipline={discipline}&gymnast={gymnastid}</Text>
            </View>

            {/* URL Parameters */}
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>URL Parameters:</Text>
              <Text style={styles.debugText}>competenceId: {Array.isArray(competenceId) ? competenceId.join(', ') : competenceId}</Text>
              <Text style={styles.debugText}>event: {Array.isArray(event) ? event.join(', ') : event}</Text>
              <Text style={styles.debugText}>number: {Array.isArray(number) ? number.join(', ') : number}</Text>
              <Text style={styles.debugText}>participants: {Array.isArray(participants) ? participants.join(', ') : participants}</Text>
              <Text style={styles.debugText}>folderId: {Array.isArray(folderId) ? folderId.join(', ') : folderId}</Text>
              <Text style={styles.debugText}>discipline: {discipline ? "true" : "false"}</Text>
              <Text style={styles.debugText}>gymnast: {gymnastid}</Text>
            </View>

            {/* Competition Info */}
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>Competition Info:</Text>
              <Text style={styles.debugText}>Competition ID: {Array.isArray(competenceId) ? competenceId.join(', ') : competenceId}</Text>
              <Text style={styles.debugText}>Event: {Array.isArray(event) ? event.join(', ') : event}</Text>
              <Text style={styles.debugText}>Participant: {Array.isArray(number) ? number.join(', ') : number}/{Array.isArray(participants) ? participants.join(', ') : participants}</Text>
              <Text style={styles.debugText}>Folder ID: {Array.isArray(folderId) ? folderId.join(', ') : folderId}</Text>
              <Text style={styles.debugText}>Discipline: {discipline ? "WAG" : "MAG"}</Text>
            </View>

            {/* Gymnast Info */}
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>Gymnast Info:</Text>
              <Text style={styles.debugText}>ID: {gymnastid}</Text>
              <Text style={styles.debugText}>Name: {gymnastName}</Text>
              <Text style={styles.debugText}>NOC: {gymnastNoc}</Text>
              <Text style={styles.debugText}>BIB: {gymnastBib}</Text>
              <Text style={styles.debugText}>Event: {gymnastEvent}</Text>
            </View>

            {/* Vault Info (if applicable) */}
            {(vaultnumber || vaultDescription || startValue !== undefined || gender !== undefined) && (
              <View style={styles.debugSection}>
                <Text style={styles.debugSectionTitle}>Vault Info:</Text>
                {vaultnumber && <Text style={styles.debugText}>Vault Number: {vaultnumber}</Text>}
                {vaultDescription && <Text style={styles.debugText}>Description: {vaultDescription}</Text>}
                {startValue !== undefined && <Text style={styles.debugText}>Start Value: {startValue}</Text>}
                {gender !== undefined && <Text style={styles.debugText}>Gender: {gender ? "MAG" : "WAG"}</Text>}
              </View>
            )}

            {/* Rate Info */}
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>Rate Info:</Text>
              <Text style={styles.debugText}>Rate ID: {rateid}</Text>
              <Text style={styles.debugText}>Total Elements: {totalElements}</Text>
              <Text style={styles.debugText}>Difficulty Values: {difficultyValues}</Text>
              <Text style={styles.debugText}>Element Groups Total: {elementGroupsTotal}</Text>
              <Text style={styles.debugText}>CV: {cv}</Text>
              <Text style={styles.debugText}>SV: {sv}</Text>
              <Text style={styles.debugText}>ND: {nd}</Text>
              <Text style={styles.debugText}>Stick Bonus: {stickbonus ? "Yes" : "No"}</Text>
            </View>

            {/* Scores */}
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>Scores:</Text>
              <Text style={styles.debugText}>Execution: {execution}</Text>
              <Text style={styles.debugText}>E-Score: {eScore}</Text>
              <Text style={styles.debugText}>My Score: {myScore}</Text>
              <Text style={styles.debugText}>Score: {score}</Text>
              <Text style={styles.debugText}>Delta: {delt}</Text>
              <Text style={styles.debugText}>Deduction: {ded}</Text>
              <Text style={styles.debugText}>Percentage: {percentage}</Text>
            </View>

            {/* Element Counts */}
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>Element Counts:</Text>
              {Object.entries(elementCounts).map(([key, value]) => (
                <Text key={key} style={styles.debugText}>
                  {key}: {value.value} (Selected: {value.selected ? "Yes" : "No"})
                </Text>
              ))}
            </View>

            {/* Element Groups */}
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>Element Groups:</Text>
              {Object.entries(elementGroupValues).map(([key, value]) => (
                <Text key={key} style={styles.debugText}>
                  Group {key}: {value}
                </Text>
              ))}
            </View>

            {/* Competition Deductions */}
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>Competition Info:</Text>
              <Text style={styles.debugText}>D: {d}</Text>
              <Text style={styles.debugText}>E: {e}</Text>
              <Text style={styles.debugText}>ND Comp: {ndcomp}</Text>
              <Text style={styles.debugText}>SB: {sb ? "Yes" : "No"}</Text>
            </View>

            {/* Save Information */}
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>Save Status:</Text>
              <Text style={styles.debugText}>Save Attempts: {saveAttempts}</Text>
              <Text style={styles.debugText}>
                Last Save: {lastSaveTime ? lastSaveTime.toLocaleString() : "Never"}
              </Text>
              <Text style={styles.debugText}>
                Current Warning: {saveWarning || "None"}
              </Text>
            </View>

            {/* Modal States */}
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>Modal States:</Text>
              <Text style={styles.debugText}>CV Modal: {showCvModal ? "Open" : "Closed"}</Text>
              <Text style={styles.debugText}>ND Modal: {showNdModal ? "Open" : "Closed"}</Text>
              <Text style={styles.debugText}>Execution Modal: {showExecutionModal ? "Open" : "Closed"}</Text>
              <Text style={styles.debugText}>Comments Modal: {showCommentsModal ? "Open" : "Closed"}</Text>
              <Text style={styles.debugText}>D Modal: {showDModal ? "Open" : "Closed"}</Text>
              <Text style={styles.debugText}>E Modal: {showEModal ? "Open" : "Closed"}</Text>
              <Text style={styles.debugText}>ND Comp Modal: {showNdCompModal ? "Open" : "Closed"}</Text>
              {showSvModal !== undefined && <Text style={styles.debugText}>SV Modal: {showSvModal ? "Open" : "Closed"}</Text>}
              {showmodalmag !== undefined && <Text style={styles.debugText}>MAG Vault Modal: {showmodalmag ? "Open" : "Closed"}</Text>}
              {showmodalwag !== undefined && <Text style={styles.debugText}>WAG Vault Modal: {showmodalwag ? "Open" : "Closed"}</Text>}
            </View>

            {/* Comments */}
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>Comments:</Text>
              <Text style={styles.debugText}>
                Comments: "{comments}" (Length: {comments.length})
              </Text>
            </View>

            {/* Navigation Routes */}
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>Available Navigation Routes:</Text>
              <Text style={styles.debugText}>BACK: Previous gymnast in sequence</Text>
              <Text style={styles.debugText}>START LIST: /start-gudging?id={Array.isArray(competenceId) ? competenceId.join(',') : competenceId}&discipline={discipline}&participants={Array.isArray(participants) ? participants.join(',') : participants}&number={Array.isArray(number) ? number.join(',') : number}&gymnast={gymnastid}&folderId={Array.isArray(folderId) ? folderId.join(',') : folderId}</Text>
              <Text style={styles.debugText}>MAIN TABLE: /final-table?competenceId={Array.isArray(competenceId) ? competenceId.join(',') : competenceId}&gymnastId={discipline}&event={Array.isArray(event) ? event.join(',') : event}&discipline={discipline}&gymnast={gymnastid}&number={Array.isArray(number) ? number.join(',') : number}&participants={Array.isArray(participants) ? participants.join(',') : participants}&folderId={Array.isArray(folderId) ? folderId.join(',') : folderId}</Text>
              <Text style={styles.debugText}>NEXT: Next gymnast in sequence</Text>
            </View>

            {/* Application Logs */}
            <View style={styles.debugSection}>
              <View style={styles.logsHeader}>
                <Text style={styles.debugSectionTitle}>Application Logs ({logs.length}):</Text>
                <TouchableOpacity onPress={clearLogs} style={styles.clearLogsButton}>
                  <Text style={styles.clearLogsText}>Clear</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.logsContainer} nestedScrollEnabled={true}>
                {logs.length === 0 ? (
                  <Text style={styles.debugText}>No logs captured yet...</Text>
                ) : (
                  logs.map((log) => (
                    <View key={log.id} style={styles.logEntry}>
                      <View style={styles.logHeader}>
                        <Text style={[styles.logLevel, getLogLevelStyle(log.level)]}>
                          {log.level}
                        </Text>
                        <Text style={styles.logTimestamp}>{log.timestamp}</Text>
                      </View>
                      <Text style={styles.logMessage} numberOfLines={3} ellipsizeMode="tail">
                        {log.message}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>

          </ScrollView>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  debugToggleContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  debugToggleButton: {
    backgroundColor: "#6c757d",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
  },
  debugToggleText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  debugPanel: {
    backgroundColor: "#f8f9fa",
    margin: 10,
    borderRadius: 10,
    padding: 15,
    borderWidth: 2,
    borderColor: "#dee2e6",
    maxHeight: 400,
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#495057",
    textAlign: "center",
    marginBottom: 15,
  },
  debugHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  downloadButton: {
    backgroundColor: "#28a745",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  downloadButtonText: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
    marginLeft: 2,
  },
  debugScrollView: {
    maxHeight: 350,
  },
  debugSection: {
    backgroundColor: "white",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#007bff",
  },
  debugSectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#007bff",
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: "#495057",
    marginBottom: 3,
    fontFamily: "monospace",
  },
  
  // Logs styles
  logsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  clearLogsButton: {
    backgroundColor: "#dc3545",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  clearLogsText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  logsContainer: {
    maxHeight: 200,
    backgroundColor: "#f8f9fa",
    borderRadius: 4,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  logEntry: {
    backgroundColor: "white",
    padding: 8,
    marginBottom: 4,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#6c757d",
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  logLevel: {
    fontSize: 10,
    fontWeight: "bold",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    color: "white",
    backgroundColor: "#6c757d",
  },
  logLevelLOG: {
    backgroundColor: "#28a745",
  },
  logLevelERROR: {
    backgroundColor: "#dc3545",
  },
  logLevelWARN: {
    backgroundColor: "#ffc107",
    color: "#212529",
  },
  logLevelINFO: {
    backgroundColor: "#17a2b8",
  },
  logTimestamp: {
    fontSize: 10,
    color: "#6c757d",
    fontFamily: "monospace",
  },
  logMessage: {
    fontSize: 11,
    color: "#495057",
    fontFamily: "monospace",
    lineHeight: 14,
  },
});

export default DebugPanel;
