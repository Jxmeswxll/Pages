Global selectedFilePath As String
'THE GREEN TEXT DOES NOT AFFECT THE CODE AT ALL THEY ARE NOTES/TIPS ON HOW IT WORKS

' SHOWS THE USER FORM (POP-UP WINDOW WHEN BUTTON CLICKED)
Sub ShowDialog()
    UserForm1.Show
End Sub

' ACTUAL SCRIPT THE BUILDS THE NEW SUMMARY PAGE//RUNS ANALYSIS//CHANGES COLUMN WIDTH ETC...
Sub ComplianceCheck() ' Renamed back from ConversationAnalysis to ensure UserForm compatibility
    Dim lastRow As Long, i As Long
    Dim resultsSheet As Worksheet, rowCounter As Integer ' Renamed row to rowCounter
    Dim externalWb As Workbook
    Dim externalWs As Worksheet
    ' Dim rulesSheet As Worksheet ' Rules sheet might not be used in the new version or will be repurposed
    ' Set rulesSheet = ThisWorkbook.Sheets("Rules")
    
    If selectedFilePath = "" Then Exit Sub
    Set externalWb = Workbooks.Open(selectedFilePath)
    
    On Error Resume Next ' Keep error handling for sheet creation
    Set resultsSheet = Nothing ' Reset for safety
    Set resultsSheet = externalWb.Sheets("Conversation Summary") ' New sheet name
    
    If resultsSheet Is Nothing Then
        Set resultsSheet = externalWb.Sheets.Add(After:=externalWb.Sheets(externalWb.Sheets.count))
        resultsSheet.Name = "Conversation Summary" ' New sheet name
        rowCounter = 2
        Call SetupResultsSheetHeadings(resultsSheet)
    Else
        resultsSheet.Cells.ClearContents ' Clear existing content if sheet exists
        rowCounter = 2
        Call SetupResultsSheetHeadings(resultsSheet) ' Re-apply headings
        ' rowCounter = resultsSheet.Cells(resultsSheet.Rows.count, 1).End(xlUp).row + 1 ' If appending, use this
    End If
    On Error GoTo 0 ' Reset error handling
    
    Dim usernameSheet As Worksheet
    Set usernameSheet = ThisWorkbook.Sheets("Usernames")

    ' Adjust column widths - this will need to be more dynamic or set to a general good width
    resultsSheet.Columns.ColumnWidth = 25 ' General width, can be fine-tuned
    
    ' Format Engagement ID column (column 3) as Text to prevent scientific notation
    resultsSheet.Columns(3).NumberFormat = "@"

    resultsSheet.Activate
    If ActiveWindow Is Nothing Then
        ' Handle case where externalWb might not be active window
    Else
        ActiveWindow.DisplayGridlines = True
    End If
    
    ' Data structures for each transcript
    Dim transcriptLines As Collection
    Dim lineData As Scripting.Dictionary
    Dim fullTranscriptText As String
    Dim speaker As String, lineTime As String, lineTextValue As String

    For Each externalWs In externalWb.Worksheets
        If externalWs.Name <> "Conversation Summary" And externalWs.Name <> "Rules" And externalWs.Name <> "Usernames" Then ' Avoid processing summary, rules, usernames sheets
            
            Set transcriptLines = New Collection
            fullTranscriptText = ""
            
            ' Assuming chat log relevant data starts from row 1. Adjust if needed.
            ' Column A: Time, Column B: Speaker, Column C: Text (as in chat12.txt structure)
            ' The original script started transcript text from row 10. Engagement ID was row 8, col 1.
            ' Let's assume the main chat (Time, Speaker, Text) starts at row 2 of the externalWs
            ' And Engagement ID is at row 1, col 1 of externalWs
            
            lastRow = externalWs.Cells(externalWs.Rows.count, 1).End(xlUp).row ' Check last row based on Time column
            
            For i = 1 To lastRow ' Iterate all rows to capture all data
                lineTime = Trim(CStr(externalWs.Cells(i, 1).Value))
                speaker = Trim(CStr(externalWs.Cells(i, 2).Value))
                lineTextValue = Trim(CStr(externalWs.Cells(i, 3).Value))

                Set lineData = New Scripting.Dictionary
                On Error Resume Next ' Handle potential errors if worksheet structure is unexpected
                lineData("Time") = lineTime
                lineData("Speaker") = speaker
                lineData("Text") = lineTextValue
                On Error GoTo 0
                transcriptLines.Add lineData
                
                If speaker <> "System" And lineTextValue <> "" Then ' Concatenate non-system messages for full text search
                    fullTranscriptText = fullTranscriptText & " " & lineTextValue
                End If
            Next i

            ' Extract common info
            Dim chatDate As String
            chatDate = ExtractChatDate(transcriptLines) ' Modified to use transcriptLines
 
            Dim engagementID As String
            engagementID = ExtractEngagementID(externalWs, transcriptLines) ' Modified

            Dim agentUsername As String
            agentUsername = FindAgentUsername(transcriptLines, LoadValidUsernames()) ' Modified
    
            Dim agentName As String
            agentName = FoundName(agentUsername, usernameSheet) ' Existing function

            ' Populate results sheet
            resultsSheet.Cells(rowCounter, 1).Value = externalWs.Name 'Sheet Name
            resultsSheet.Cells(rowCounter, 2).Value = agentName
            resultsSheet.Cells(rowCounter, 3).Value = engagementID
            resultsSheet.Cells(rowCounter, 4).Value = chatDate
            
            Dim saleOrderNumberResult As String
            saleOrderNumberResult = CheckSaleOrderNumber(transcriptLines, fullTranscriptText)
            resultsSheet.Cells(rowCounter, 5).Value = saleOrderNumberResult
            
            If saleOrderNumberResult <> "Not Found" And saleOrderNumberResult <> "N/A" And saleOrderNumberResult <> "" Then
                resultsSheet.Cells(rowCounter, 6).Value = "No" ' Sale made
            Else
                resultsSheet.Cells(rowCounter, 6).Value = "Yes" ' No sale inferred
            End If
            
            resultsSheet.Cells(rowCounter, 7).Value = CheckHighRiskAlerted(transcriptLines, fullTranscriptText)
            resultsSheet.Cells(rowCounter, 8).Value = CheckOpeningMessageTime(transcriptLines, agentUsername)
            resultsSheet.Cells(rowCounter, 9).Value = "Manual Check" ' AvgResponseTime placeholder
            resultsSheet.Cells(rowCounter, 10).Value = CheckDurationOfChat(transcriptLines)
            resultsSheet.Cells(rowCounter, 11).Value = CheckAskedHowAreYou(transcriptLines, fullTranscriptText, agentUsername)
            resultsSheet.Cells(rowCounter, 12).Value = CheckAdvisedRetentionsTeam(transcriptLines, fullTranscriptText, agentUsername)
            resultsSheet.Cells(rowCounter, 13).Value = CheckAcknowledgedTenure(transcriptLines, fullTranscriptText, agentUsername)
            resultsSheet.Cells(rowCounter, 14).Value = CheckRoamingAsked(transcriptLines, fullTranscriptText, agentUsername)
            resultsSheet.Cells(rowCounter, 15).Value = CheckEntertainmentAsked(transcriptLines, fullTranscriptText, agentUsername)
            resultsSheet.Cells(rowCounter, 16).Value = CheckHbbOrAdditionalAsked(transcriptLines, fullTranscriptText, agentUsername)
            resultsSheet.Cells(rowCounter, 17).Value = CheckMgrDiscountUsed(transcriptLines, fullTranscriptText, agentUsername)
            resultsSheet.Cells(rowCounter, 18).Value = CheckVodafoneTogetherOffered(transcriptLines, fullTranscriptText, agentUsername)
            resultsSheet.Cells(rowCounter, 19).Value = CheckInsuranceOffered(transcriptLines, fullTranscriptText, agentUsername)
            resultsSheet.Cells(rowCounter, 20).Value = CheckAccessoryOffered(transcriptLines, fullTranscriptText, agentUsername)
            resultsSheet.Cells(rowCounter, 21).Value = CheckTradeInOffered(transcriptLines, fullTranscriptText, agentUsername)
            resultsSheet.Cells(rowCounter, 22).Value = CheckBenefitsExplained(transcriptLines, fullTranscriptText, agentUsername)
            resultsSheet.Cells(rowCounter, 23).Value = CheckSummarisePurchase(transcriptLines, fullTranscriptText, agentUsername)
            resultsSheet.Cells(rowCounter, 24).Value = CheckWhatElseCanIHelp(transcriptLines, fullTranscriptText, agentUsername)
            
            rowCounter = rowCounter + 1
        End If
    Next externalWs
    Call ApplyConditionalFormatting(resultsSheet) ' Keep conditional formatting
    externalWb.Save
    externalWb.Activate
End Sub

'SETS THE HEADING ROW ON THE SHEET
Sub SetupResultsSheetHeadings(sheet As Worksheet)
    Dim headings() As String
    headings = Split("Sheet Name,Advisor Name,Engagement ID,Date,Sale_OrderNumber,Sale_NoSaleInferred,Sale_HighRiskAlerted," & _
                     "Greet_OpeningMessageTime,Greet_AvgResponseTime,Greet_DurationOfChat,Greet_AskedHowAreYou,Greet_AdvisedRetentionsTeam," & _
                     "Loyalty_AcknowledgedTenure,FactFind_RoamingAsked,FactFind_EntertainmentAsked,FactFind_HbbOrAdditionalAsked," & _
                     "DealOffer_MgrDiscountUsed,DealOffer_VodafoneTogetherOffered,DealOffer_InsuranceOffered,DealOffer_AccessoryOffered,DealOffer_TradeInOffered," & _
                     "Objections_BenefitsExplained,FCR_SummarisePurchase,FCR_WhatElseCanIHelp", ",")
    
    Dim i As Integer
    For i = LBound(headings) To UBound(headings)
        With sheet.Cells(1, i + 1)
            .Value = Trim(headings(i)) ' Trim potential spaces from Split
            .Font.Bold = True
        End With
    Next i
End Sub

'Loads Usernames from the "Usernames" sheet
Function LoadValidUsernames() As Scripting.Dictionary

    Dim usernameSheet As Worksheet

    Set usernameSheet = ThisWorkbook.Sheets("Usernames")

    Dim lastRow As Long

    lastRow = usernameSheet.Cells(usernameSheet.Rows.count, 1).End(xlUp).row
    Dim validUsernames As New Scripting.Dictionary

    Dim i As Long
    For i = 1 To lastRow
        Dim username As String
        username = usernameSheet.Cells(i, 1).Value
        If Not validUsernames.Exists(username) Then
            validUsernames.Add username, True
        End If
    Next i

    Set LoadValidUsernames = validUsernames
End Function

Function FoundName(username As String, usernameSheet As Worksheet) As String
    Dim lastRow As Long
    lastRow = usernameSheet.Cells(usernameSheet.Rows.count, 1).End(xlUp).row

    Dim i As Long
    For i = 1 To lastRow
        If usernameSheet.Cells(i, 1).Value = username Then
            FoundName = usernameSheet.Cells(i, 2).Value
            Exit Function
        End If
    Next i
    FoundName = "" ' Return empty string if not found
End Function

' ----- Helper function to parse a timestamp string (HH:MM:SS or MM/DD HH:MM:SS) into a Date object -----
Private Function ParseTimestamp(ts As String) As Date
    On Error Resume Next
    Dim parts As Variant
    Dim datePart As String, timePart As String
    
    If InStr(ts, " ") > 0 Then ' Contains space, might have date and time
        parts = Split(ts, " ")
        If UBound(parts) = 1 Then ' Two parts: Date and Time
            datePart = parts(0)
            timePart = parts(1)
        ElseIf UBound(parts) > 1 Then ' More parts, assume last is time, second to last is date
             timePart = parts(UBound(parts))
             datePart = parts(UBound(parts)-1)
        Else ' Only one part, assume it's time
            timePart = ts
            datePart = ""
        End If
    Else ' No space, assume it's just time
        timePart = ts
        datePart = ""
    End If

    If datePart = "" Then
        ParseTimestamp = CDate(timePart)
    Else
        ' Check if datePart is like MM/DD or DD/MM
        If InStr(datePart, "/") > 0 Then
             ' Attempt to parse with system's date format awareness
            ParseTimestamp = CDate(datePart & " " & timePart)
        Else ' If datePart is not recognized, just use timePart
            ParseTimestamp = CDate(timePart)
        End If
    End If
    If Err.Number <> 0 Then
        ParseTimestamp = CDate("00:00:00") ' Default on error
        Err.Clear
    End If
    On Error GoTo 0
End Function

' ----- Modified/New Helper Functions -----
Function ExtractChatDate(transcriptLines As Collection) As String
    On Error Resume Next
    Dim firstLineTime As String
    If transcriptLines.count > 0 Then
        Dim lineData As Scripting.Dictionary
        Set lineData = transcriptLines(1) ' Get the first line
        firstLineTime = lineData("Time") ' Expected format e.g., "05/12 13:12:38"
        
        If InStr(firstLineTime, " ") > 0 Then
            Dim datePart As String
            datePart = Split(firstLineTime, " ")(0) ' Get "05/12"
            ' Convert "MM/DD" to "DD-Mon"
            If InStr(datePart, "/") = 3 Then ' e.g. MM/DD
                Dim monthNum As Integer, dayNum As Integer
                monthNum = CInt(Left(datePart, 2))
                dayNum = CInt(Mid(datePart, 4, 2))
                ExtractChatDate = Format(DateSerial(Year(Now), monthNum, dayNum), "DD-MMM")
                Exit Function
            End If
        End If
    End If
    ExtractChatDate = "N/A" ' Default if not found or format is unexpected
    On Error GoTo 0
End Function

Function ExtractEngagementID(ws As Worksheet, transcriptLines As Collection) As String
    On Error Resume Next
    Dim engagementIDVal As String
    Dim potentialID As String

    ' Prioritize reading from cell A8 (Cells(8,1)) - Original script method
    engagementIDVal = Trim(CStr(ws.Cells(8, 1).Value))
    
    If engagementIDVal <> "" Then
        If LCase(Left(engagementIDVal, Len("Engagement ID "))) = LCase("Engagement ID ") Then
            potentialID = Trim(Mid(engagementIDVal, Len("Engagement ID ") + 1))
        Else
            potentialID = engagementIDVal
        End If
        
        ' Check if the extracted potentialID is not empty and seems valid (e.g., is numeric or contains numbers)
        If potentialID <> "" Then
            Dim tempChar As String, k As Long, hasNumber As Boolean
            hasNumber = False
            For k = 1 To Len(potentialID)
                tempChar = Mid(potentialID, k, 1)
                If IsNumeric(tempChar) Then
                    hasNumber = True
                    Exit For
                End If
            Next k
            If hasNumber Then ' Consider it valid if it contains at least one number
                ExtractEngagementID = potentialID
                Exit Function
            End If
        End If
    End If

    ' Fallback 1: Try reading from the worksheet's first cell (A1) if A8 failed
    Dim firstLineText As String
    firstLineText = Trim(CStr(ws.Cells(1, 1).Value))
    If LCase(firstLineText) Like "engagement id *" Then
        ExtractEngagementID = Trim(Mid(firstLineText, Len("Engagement ID") + 1))
        If ExtractEngagementID <> "" Then Exit Function
    End If

    ' Fallback 2: check first few lines in transcriptLines collection if available
    Dim i As Long
    For i = 1 To Application.WorksheetFunction.Min(5, transcriptLines.count) ' Check first 5 lines
        Dim lineData As Scripting.Dictionary
        Set lineData = transcriptLines(i)
        
        ' Check the "Time" field first as Engagement ID might be there if it's the first actual line of data
        firstLineText = Trim(CStr(lineData("Time")))
        If LCase(firstLineText) Like "engagement id *" Then
            ExtractEngagementID = Trim(Mid(firstLineText, Len("Engagement ID") + 1))
            If ExtractEngagementID <> "" Then Exit Function
        End If

        ' Then check the "Text" field of the line
        firstLineText = Trim(CStr(lineData("Text")))
         If LCase(firstLineText) Like "engagement id *" Then
            ExtractEngagementID = Trim(Mid(firstLineText, Len("Engagement ID") + 1))
            If ExtractEngagementID <> "" Then Exit Function
        End If
    Next i
    
    ExtractEngagementID = "Not Found"
    On Error GoTo 0
End Function

' Re-uses original FoundName, ensure usernameSheet is ThisWorkbook.Sheets("Usernames")
' Function FoundName(username As String, usernameSheet As Worksheet) As String ... (keep original)

Function FindAgentUsername(transcriptLines As Collection, validUsernames As Scripting.Dictionary) As String
    On Error Resume Next
    Dim lineData As Scripting.Dictionary
    Dim lineText As String
    Dim userNameStart As Integer
    Dim userNameEnd As Integer
    Dim extractedUsername As String
    Dim i As Long

    For i = 1 To transcriptLines.count
        Set lineData = transcriptLines(i)
        lineText = lineData("Text") ' Assuming username is in the "Text" part of the line

        If InStr(lineText, "]: Agent enters chat (as ") > 0 Or InStr(lineText, "exits chat") > 0 Then
            If InStr(lineText, "[") > 0 And InStr(lineText, "]:") > InStr(lineText, "[") Then
                userNameStart = InStr(lineText, "[") + 1
                userNameEnd = InStr(lineText, "]:") - 1
                If userNameEnd >= userNameStart Then
                    extractedUsername = Mid(lineText, userNameStart, userNameEnd - userNameStart + 1)
                    If validUsernames.Exists(extractedUsername) Then
                        FindAgentUsername = extractedUsername
                        Exit Function
                    End If
                End If
            End If
        End If
    Next i
    FindAgentUsername = "UnknownAgent" ' Default if not found
    On Error GoTo 0
End Function

' ----- New Check Functions -----
Function CheckSaleOrderNumber(transcriptLines As Collection, fullTranscriptText As String) As String
    On Error Resume Next
    Dim lineData As Scripting.Dictionary
    Dim lineText As String
    Dim i As Long
    Dim orderNumPos As Long
    Dim extractedOrderString As String

    For i = 1 To transcriptLines.count
        Set lineData = transcriptLines(i)
        lineText = CStr(lineData("Text")) ' Ensure lineText is string
        
        ' Look for patterns indicating an order number
        If InStr(1, lineText, "CDH-", vbTextCompare) > 0 Then
            CheckSaleOrderNumber = "CDH"
            Exit Function
        ElseIf InStr(1, lineText, "SBL-", vbTextCompare) > 0 Then
            CheckSaleOrderNumber = "SBL"
            Exit Function
        End If
        
        ' More generic check if the above are missed
        orderNumPos = InStr(1, lineText, "order number and tracking ID is ", vbTextCompare)
        If orderNumPos > 0 Then
            extractedOrderString = Trim(Mid(lineText, orderNumPos + Len("order number and tracking ID is ")))
            If UCase(Left(extractedOrderString, 4)) = "CDH-" Then
                CheckSaleOrderNumber = "CDH"
                Exit Function
            ElseIf UCase(Left(extractedOrderString, 4)) = "SBL-" Then
                CheckSaleOrderNumber = "SBL"
                Exit Function
            End If
        End If
        
        orderNumPos = InStr(1, lineText, "Order no: ", vbTextCompare)
        If orderNumPos > 0 Then
            extractedOrderString = Trim(Mid(lineText, orderNumPos + Len("Order no: ")))
            If UCase(Left(extractedOrderString, 4)) = "CDH-" Then
                CheckSaleOrderNumber = "CDH"
                Exit Function
            ElseIf UCase(Left(extractedOrderString, 4)) = "SBL-" Then
                CheckSaleOrderNumber = "SBL"
                Exit Function
            End If
        End If
    Next i
    CheckSaleOrderNumber = "Not Found"
    On Error GoTo 0
End Function

Function CheckHighRiskAlerted(transcriptLines As Collection, fullTranscriptText As String) As String
    On Error Resume Next
    If InStr(1, fullTranscriptText, "Supervisor User connected", vbTextCompare) > 0 Or _
       InStr(1, fullTranscriptText, "Supervisor '", vbTextCompare) > 0 And InStr(1, fullTranscriptText, "' enters chat", vbTextCompare) > 0 Then
        CheckHighRiskAlerted = "Yes"
    Else
        CheckHighRiskAlerted = "No"
    End If
    On Error GoTo 0
End Function

Function CheckOpeningMessageTime(transcriptLines As Collection, agentUsername As String) As String
    On Error Resume Next
    Dim agentEntryTime As Date
    Dim firstAgentMessageTime As Date
    Dim foundAgentEntry As Boolean
    Dim lineData As Scripting.Dictionary
    Dim i As Long, j As Long
    Dim speaker As String, lineText As String, timeStr As String
    
    foundAgentEntry = False

    ' Find agent entry time
    For i = 1 To transcriptLines.count
        Set lineData = transcriptLines(i)
        speaker = lineData("Speaker")
        lineText = lineData("Text")
        timeStr = lineData("Time")
        
        If InStr(1, lineText, agentUsername & "]: Agent enters chat", vbTextCompare) > 0 Or _
           (speaker = "Agent" And InStr(1, lineText, agentUsername, vbTextCompare) > 0 And InStr(1, lineText, "enters chat", vbTextCompare) > 0) Then
            agentEntryTime = ParseTimestamp(timeStr)
            foundAgentEntry = True
            Exit For
        End If
    Next i

    If Not foundAgentEntry Then
        CheckOpeningMessageTime = "N/A (Agent Entry Not Found)"
        Exit Function
    End If

    ' Find first subsequent freehand message from the same agent
    For j = i To transcriptLines.count ' Start from agent entry line or after
        Set lineData = transcriptLines(j)
        speaker = lineData("Speaker")
        lineText = lineData("Text")
        timeStr = lineData("Time")

        If (InStr(1, speaker, "Agent-Freehand") > 0 And InStr(1, lineText, "[" & agentUsername & "]:") > 0) Or _
           (speaker = "Agent" And InStr(1, lineText, "[" & agentUsername & "]:") > 0 And Not (lineText Like "*enters chat*" Or lineText Like "*exits chat*")) Then
            If Trim(Mid(lineText, InStr(lineText, "]:") + 2)) <> "" Then ' Check if there's actual text after username tag
                firstAgentMessageTime = ParseTimestamp(timeStr)
                Dim diffSeconds As Long
                diffSeconds = DateDiff("s", agentEntryTime, firstAgentMessageTime)
                If diffSeconds < 0 Then diffSeconds = 0 ' Handle potential time parsing issues or overnight chats
                CheckOpeningMessageTime = diffSeconds & " seconds"
                Exit Function
            End If
        End If
    Next j
    
    CheckOpeningMessageTime = "N/A (No Greeting Found)"
    On Error GoTo 0
End Function

Function CheckDurationOfChat(transcriptLines As Collection) As String
    On Error Resume Next
    If transcriptLines.count < 2 Then
        CheckDurationOfChat = "N/A (Too Short)"
        Exit Function
    End If
    
    Dim firstTimeStr As String, lastTimeStr As String
    Dim firstTime As Date, lastTime As Date
    
    firstTimeStr = transcriptLines(1)("Time")
    lastTimeStr = transcriptLines(transcriptLines.count)("Time")
    
    firstTime = ParseTimestamp(firstTimeStr)
    lastTime = ParseTimestamp(lastTimeStr)
    
    If lastTime < firstTime Then ' Chat spanned midnight
        lastTime = DateAdd("d", 1, lastTime)
    End If
    
    Dim durationSeconds As Long
    durationSeconds = DateDiff("s", firstTime, lastTime)
    
    If durationSeconds < 0 Then
         CheckDurationOfChat = "N/A (Time Error)"
    Else
        CheckDurationOfChat = Format(durationSeconds / 86400, "hh:mm:ss") ' 86400 seconds in a day
    End If
    On Error GoTo 0
End Function

Private Function GenericKeywordCheck(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String, keywords As Variant, Optional speakerMustBeAgent As Boolean = True) As String
    On Error Resume Next
    Dim keyword As Variant
    Dim lineData As Scripting.Dictionary
    Dim lineText As String, speaker As String
    Dim i As Long

    If IsMissing(keywords) Then
        GenericKeywordCheck = "N/A (No Keywords)"
        Exit Function
    End If
    
    If Not IsArray(keywords) Then
        keywords = Array(keywords) ' Convert single keyword to array
    End If

    For Each keyword In keywords
        If Trim(CStr(keyword)) = "" Then GoTo NextKeyword ' Skip empty keywords
        
        If speakerMustBeAgent Then
            For i = 1 To transcriptLines.count
                Set lineData = transcriptLines(i)
                lineText = CStr(lineData("Text"))
                speaker = CStr(lineData("Speaker"))
                
                ' Check if the speaker is the identified agent or "Agent-Freehand" by this agent
                If (InStr(1, speaker, "Agent", vbTextCompare) > 0 And InStr(1, lineText, "[" & agentUsername & "]:", vbTextCompare) > 0) Or _
                   (speaker = agentUsername) Then ' If speaker field directly contains agent username
                    If InStr(1, lineText, CStr(keyword), vbTextCompare) > 0 Then
                        GenericKeywordCheck = "Yes"
                        Exit Function
                    End If
                End If
            Next i
        Else ' Check full transcript text if speaker doesn't matter or for customer lines
            If InStr(1, fullTranscriptText, CStr(keyword), vbTextCompare) > 0 Then
                GenericKeywordCheck = "Yes"
                Exit Function
            End If
        End If
NextKeyword:
    Next keyword
    
    GenericKeywordCheck = "No"
    On Error GoTo 0
End Function

Function CheckAskedHowAreYou(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    ' Reverted to the broader set of keywords as per user clarification.
    keywords = Array("how are you", "how are you doing", "hope you're having a great day", "hope you're well")
    CheckAskedHowAreYou = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function

Function CheckAdvisedRetentionsTeam(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("Retention Team", "Retentions Team", "part of Retentions", "I'm in Retentions", "Vodafone’s Retention team") ' Added "Retention Team" and specific phrase
    CheckAdvisedRetentionsTeam = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function

Function CheckAcknowledgedTenure(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("valued customer", "valuable customer", "long time customer", "thanks for being with us for")
    CheckAcknowledgedTenure = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function

Function CheckRoamingAsked(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("roaming", "holiday", "travel", "international calls", "use your phone abroad")
    CheckRoamingAsked = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function

Function CheckEntertainmentAsked(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("Entertainment", "Amazon Prime", "Youtube Premium", "Disney Plus", "streaming services")
    CheckEntertainmentAsked = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function

Function CheckHbbOrAdditionalAsked(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("broadband", "home broadband", "wifi", "another line", "additional SIM", "another device")
    CheckHbbOrAdditionalAsked = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function

Function CheckMgrDiscountUsed(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("manager's discount", "manager discount", "special offer from my manager", "supervisor discount")
    CheckMgrDiscountUsed = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function

Function CheckVodafoneTogetherOffered(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("Vodafone Together", "family discount", "household discount") ' Simplified
    CheckVodafoneTogetherOffered = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function

Function CheckInsuranceOffered(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("insurance", "cover for your device", "damage cover", "theft cover", "device protection")
    CheckInsuranceOffered = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function

Function CheckAccessoryOffered(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("plug", "charger", "case", "screen protector", "accessories for your phone", "accessory bundle")
    CheckAccessoryOffered = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function

Function CheckTradeInOffered(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("trade in", "trade-in", "trade your old device", "recycle your phone")
    CheckTradeInOffered = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function

Function CheckBenefitsExplained(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("Lifetime service", "battery refresh", "VeryMe", "Xchange", "trade-in guarantee", "warranty", "lifetime warranty")
    CheckBenefitsExplained = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function

Function CheckSummarisePurchase(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("to summarise", "summary of your order", "just to confirm your new plan", "let me recap")
    CheckSummarisePurchase = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function

Function CheckWhatElseCanIHelp(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("what else can I help", "anything else I can do", "any other questions", "is there anything else")
    CheckWhatElseCanIHelp = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function


' Keep original ApplyConditionalFormatting, LoadValidUsernames, FoundName
' Remove old Check... functions (CheckDirectDebit, CheckSpendManager, etc.)

Sub ApplyConditionalFormatting(ws As Worksheet)

    Dim targetRange As Range
    Set targetRange = ws.Range("A1:Z10000")

    ' Formatting for "Pass"
    With targetRange.FormatConditions.Add(Type:=xlTextString, String:="Pass", TextOperator:=xlContains)
        .Interior.Color = RGB(198, 239, 206) ' Light Green Background
        .Font.Color = RGB(0, 97, 0)          ' Dark Green Text
        .Font.Bold = True
    End With

    ' Formatting for "Fail"
    With targetRange.FormatConditions.Add(Type:=xlTextString, String:="Fail", TextOperator:=xlContains)
        .Interior.Color = RGB(255, 199, 206) ' Light Red Background
        .Font.Color = RGB(156, 0, 6)         ' Dark Red Text
        .Font.Bold = True
    End With

End Sub
