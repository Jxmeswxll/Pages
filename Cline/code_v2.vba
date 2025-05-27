Global selectedFilePath As String
'THE GREEN TEXT DOES NOT AFFECT THE CODE AT ALL THEY ARE NOTES/TIPS ON HOW IT WORKS

' SHOWS THE USER FORM (POP-UP WINDOW WHEN BUTTON CLICKED)
Sub ShowDialog() ' Renamed back for compatibility with existing Excel button/trigger
    UserForm1.Show ' Assuming UserForm1 is generic and its code calls "ComplianceCheck"
End Sub

' ACTUAL SCRIPT THE BUILDS THE NEW SUMMARY PAGE//RUNS ANALYSIS//CHANGES COLUMN WIDTH ETC...
Sub ComplianceCheck() ' Renamed back for compatibility with UserForm code
    Dim lastRow As Long, i As Long
    Dim resultsSheet As Worksheet, rowCounter As Integer
    Dim externalWb As Workbook
    Dim externalWs As Worksheet
    
    If selectedFilePath = "" Then Exit Sub
    Set externalWb = Workbooks.Open(selectedFilePath)
    
    On Error Resume Next
    Set resultsSheet = Nothing 
    Set resultsSheet = externalWb.Sheets("Conversation Summary V2") ' New sheet name for V2
    
    If resultsSheet Is Nothing Then
        Set resultsSheet = externalWb.Sheets.Add(After:=externalWb.Sheets(externalWb.Sheets.count))
        resultsSheet.Name = "Conversation Summary V2"
        rowCounter = 2
        Call SetupResultsSheetHeadingsV2(resultsSheet)
    Else
        resultsSheet.Cells.ClearContents 
        rowCounter = 2
        Call SetupResultsSheetHeadingsV2(resultsSheet)
    End If
    On Error GoTo 0 
    
    Dim usernameSheet As Worksheet
    Set usernameSheet = ThisWorkbook.Sheets("Usernames")

    ' Apply default column width only to used columns A-X (1 to 24)
    Dim j As Long
    For j = 1 To 24
        resultsSheet.Columns(j).ColumnWidth = 25
    Next j
    
    ' Specific column widths - Note: Indices are 1-based
    resultsSheet.Columns(3).NumberFormat = "@" ' Engagement ID (Column C)
    resultsSheet.Columns(4).NumberFormat = "@" ' Date (Column D)
    
    ' Indices based on the corrected heading order:
    ' Greet_OpeningMessageTime is Col G (7)
    ' Greet_AvgResponseTime is Col H (8)
    ' Greet_AgentChatDuration is Col I (9)
    resultsSheet.Columns(8).ColumnWidth = 20  ' Greet_AvgResponseTime (Column H)
    resultsSheet.Columns(9).ColumnWidth = 20  ' Greet_AgentChatDuration (Column I)
    
    ' FCR_WhatElseCanIHelp is Col W (23)
    ' Session_EndReason is Col X (24)
    resultsSheet.Columns(23).ColumnWidth = 25 ' FCR_WhatElseCanIHelp (Column W) - already default
    resultsSheet.Columns(24).ColumnWidth = 25 ' Session_EndReason (Column X) - already default

    ' Explicitly clear and hide column Y (25) onwards to ensure no artifacts
    resultsSheet.Range("Y:XFD").ClearContents ' Clear content from Y to the last possible column
    resultsSheet.Range("Y:XFD").ClearFormats  ' Clear formats
    ' resultsSheet.Range("Y:XFD").ColumnWidth = 0 ' This would hide them, but might be too aggressive. Let's try clearing first.
    ' Alternatively, set a very small width if hiding is not desired
    ' For now, let's rely on clearing and not setting a default width for them.

    resultsSheet.Activate
    If Not ActiveWindow Is Nothing Then
        ActiveWindow.DisplayGridlines = True
    End If
    
    Dim transcriptLines As Collection
    Dim lineData As Scripting.Dictionary
    Dim fullTranscriptText As String
    Dim speaker As String, lineTime As String, lineTextValue As String

    For Each externalWs In externalWb.Worksheets
        If externalWs.Name <> resultsSheet.Name And externalWs.Name <> "Rules" And externalWs.Name <> "Usernames" Then
            
            Set transcriptLines = New Collection
            fullTranscriptText = ""
            
            lastRow = externalWs.Cells(externalWs.Rows.count, 1).End(xlUp).row 
            
            For i = 1 To lastRow 
                lineTime = Trim(CStr(externalWs.Cells(i, 1).Value))
                speaker = Trim(CStr(externalWs.Cells(i, 2).Value))
                lineTextValue = Trim(CStr(externalWs.Cells(i, 3).Value))

                Set lineData = New Scripting.Dictionary
                On Error Resume Next 
                lineData("Time") = lineTime
                lineData("Speaker") = speaker
                lineData("Text") = lineTextValue
                On Error GoTo 0
                transcriptLines.Add lineData
                
                If speaker <> "System" And lineTextValue <> "" Then
                    fullTranscriptText = fullTranscriptText & " " & lineTextValue
                End If
            Next i

            Dim chatDate As String
            chatDate = ExtractChatDateV2(transcriptLines)
 
            Dim engagementID As String
            engagementID = ExtractEngagementID(externalWs, transcriptLines) ' Existing robust version

            Dim agentUsername As String
            agentUsername = FindAgentUsername(transcriptLines, LoadValidUsernames()) 
    
            Dim agentName As String
            agentName = FoundName(agentUsername, usernameSheet) 

            resultsSheet.Cells(rowCounter, 1).Value = externalWs.Name
            resultsSheet.Cells(rowCounter, 2).Value = agentName
            resultsSheet.Cells(rowCounter, 3).Value = engagementID
            resultsSheet.Cells(rowCounter, 4).Value = chatDate
            
            Dim saleOrderNumberResult As String
            saleOrderNumberResult = CheckSaleOrderNumber(transcriptLines, fullTranscriptText)
            resultsSheet.Cells(rowCounter, 5).Value = saleOrderNumberResult ' Column E
            
            resultsSheet.Cells(rowCounter, 6).Value = CheckHighRiskAlerted(transcriptLines, fullTranscriptText) ' Column F
            resultsSheet.Cells(rowCounter, 7).Value = CheckOpeningMessageTime(transcriptLines, agentUsername) ' Column G
            resultsSheet.Cells(rowCounter, 8).Value = CalculateAvgAgentResponseTime(transcriptLines, agentUsername) ' Column H
            resultsSheet.Cells(rowCounter, 9).Value = CalculateAgentChatDuration(transcriptLines, agentUsername) ' Column I
            resultsSheet.Cells(rowCounter, 10).Value = CheckAskedHowAreYou(transcriptLines, fullTranscriptText, agentUsername) ' Column J
            resultsSheet.Cells(rowCounter, 11).Value = CheckAdvisedRetentionsTeam(transcriptLines, fullTranscriptText, agentUsername) ' Column K
            resultsSheet.Cells(rowCounter, 12).Value = CheckAcknowledgedTenure(transcriptLines, fullTranscriptText, agentUsername) ' Column L
            resultsSheet.Cells(rowCounter, 13).Value = CheckRoamingAsked(transcriptLines, fullTranscriptText, agentUsername) ' Column M
            resultsSheet.Cells(rowCounter, 14).Value = CheckEntertainmentAsked(transcriptLines, fullTranscriptText, agentUsername) ' Column N
            resultsSheet.Cells(rowCounter, 15).Value = CheckHbbOrAdditionalAsked(transcriptLines, fullTranscriptText, agentUsername) ' Column O
            resultsSheet.Cells(rowCounter, 16).Value = CheckMgrDiscountUsed(transcriptLines, fullTranscriptText, agentUsername) ' Column P
            resultsSheet.Cells(rowCounter, 17).Value = CheckVodafoneTogetherOffered(transcriptLines, fullTranscriptText, agentUsername) ' Column Q
            resultsSheet.Cells(rowCounter, 18).Value = CheckInsuranceOffered(transcriptLines, fullTranscriptText, agentUsername) ' Column R
            resultsSheet.Cells(rowCounter, 19).Value = CheckAccessoryOffered(transcriptLines, fullTranscriptText, agentUsername) ' Column S
            resultsSheet.Cells(rowCounter, 20).Value = CheckTradeInOffered(transcriptLines, fullTranscriptText, agentUsername) ' Column T
            resultsSheet.Cells(rowCounter, 21).Value = CheckBenefitsExplained(transcriptLines, fullTranscriptText, agentUsername) ' Column U
            resultsSheet.Cells(rowCounter, 22).Value = CheckSummarisePurchase(transcriptLines, fullTranscriptText, agentUsername) ' Column V
            resultsSheet.Cells(rowCounter, 23).Value = CheckWhatElseCanIHelp(transcriptLines, fullTranscriptText, agentUsername) ' Column W
            resultsSheet.Cells(rowCounter, 24).Value = CheckSessionEndReason(transcriptLines) ' Column X
            
            rowCounter = rowCounter + 1
        End If
        ' Add borders to data cells (adjust to new total number of columns if necessary, currently 24 data columns)
        resultsSheet.Range(resultsSheet.Cells(rowCounter - 1, 1), resultsSheet.Cells(rowCounter - 1, 24)).Borders.LineStyle = xlContinuous
    Next externalWs
    Call ApplyConditionalFormattingV2(resultsSheet) ' Updated Conditional Formatting
    externalWb.Save
    externalWb.Activate
End Sub

Sub ApplyConditionalFormattingV2(sheet As Worksheet)
    Dim lastRow As Long, i As Long, k As Long
    Dim cellValue As String
    ' Softer, pastel colors for conditional formatting
    Dim colorPassGreen As Long: colorPassGreen = RGB(198, 239, 206) ' Light Pastel Green
    Dim colorFailRed As Long: colorFailRed = RGB(255, 199, 206)   ' Light Pastel Red
    
    lastRow = sheet.Cells(sheet.Rows.count, 1).End(xlUp).row

    For i = 2 To lastRow ' Start from row 2 (skip headers)
    
        ' Columns to apply general Yes (Green) / No (Red) formatting
        ' Column indices:
        ' 6: HighRiskAlerted
        ' 10: Greet_AskedHowAreYou
        ' 11: Greet_AdvisedRetentionsTeam
        ' 12: Loyalty_AcknowledgedTenure
        ' 13: FactFind_RoamingAsked
        ' 14: FactFind_EntertainmentAsked
        ' 15: FactFind_HbbOrAdditionalAsked
        ' 16: DealOffer_MgrDiscountUsed
        ' 17: DealOffer_VodafoneTogetherOffered
        ' 18: DealOffer_InsuranceOffered
        ' 19: DealOffer_AccessoryOffered
        ' 20: DealOffer_TradeInOffered
        ' 21: Objections_BenefitsExplained
        ' 22: FCR_SummarisePurchase
        ' 23: FCR_WhatElseCanIHelp
        Dim yesNoColumns As Variant
        yesNoColumns = Array(6, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23)

        For k = LBound(yesNoColumns) To UBound(yesNoColumns)
            cellValue = UCase(Trim(CStr(sheet.Cells(i, yesNoColumns(k)).Value)))
            If cellValue = "YES" Then
                sheet.Cells(i, yesNoColumns(k)).Interior.Color = colorPassGreen
            ElseIf cellValue = "NO" Then
                sheet.Cells(i, yesNoColumns(k)).Interior.Color = colorFailRed
            Else
                sheet.Cells(i, yesNoColumns(k)).Interior.ColorIndex = xlNone ' Clear if not Yes/No
            End If
        Next k

        ' Specific formatting for Sale_OrderNumber (Column E, index 5)
        Dim saleOrderNumberVal As String
        saleOrderNumberVal = Trim(CStr(sheet.Cells(i, 5).Value))
        If saleOrderNumberVal = "SBL" Or saleOrderNumberVal = "CDH" Then
            sheet.Cells(i, 5).Interior.Color = colorPassGreen
        ElseIf saleOrderNumberVal = "Not Found" Then
            sheet.Cells(i, 5).Interior.Color = colorFailRed
        Else
            sheet.Cells(i, 5).Interior.ColorIndex = xlNone ' Default if no specific condition met
        End If

        ' Specific formatting for Greet_OpeningMessageTime (Column G, index 7)
        Dim openingMessageTime As String
        openingMessageTime = Trim(CStr(sheet.Cells(i, 7).Value)) 
        If openingMessageTime <> "N/A" And openingMessageTime <> "N/A (Agent Entry Not Found)" And openingMessageTime <> "N/A (No Greeting Found)" Then
            Dim seconds As Long
            seconds = Val(Split(openingMessageTime, " ")(0)) ' Extract the numeric value
            If seconds <= 30 Then
                sheet.Cells(i, 7).Interior.Color = colorPassGreen
            Else
                sheet.Cells(i, 7).Interior.Color = colorFailRed
            End If
        Else
            sheet.Cells(i, 7).Interior.ColorIndex = xlNone ' Default if N/A
        End If
        
        ' Ensure Greet_AvgResponseTime (Column H, index 8) and Greet_AgentChatDuration (Column I, index 9) have no fill
        sheet.Cells(i, 8).Interior.ColorIndex = xlNone
        sheet.Cells(i, 9).Interior.ColorIndex = xlNone
        
        ' Column X (Session_EndReason, index 24) - typically no Yes/No, so ensure no fill unless specific rules are added later
        sheet.Cells(i, 24).Interior.ColorIndex = xlNone

    Next i
End Sub

Sub SetupResultsSheetHeadingsV2(sheet As Worksheet)
    Dim headings As Variant
    Dim i As Long
    Dim headerCell As Range
    Dim currentHeading As String
    Dim groupColor As Long

    ' Corrected headings string (Sale_nosale removed, HighRiskAlerted is now the 6th item in this list, but 5th after Sale_OrderNumber)
    headings = Split("Sheet Name,Advisor Name,Engagement ID,Date,Sale_OrderNumber,HighRiskAlerted," & _
                     "Greet_OpeningMessageTime,Greet_AvgResponseTime,Greet_AgentChatDuration,Greet_AskedHowAreYou,Greet_AdvisedRetentionsTeam," & _
                     "Loyalty_AcknowledgedTenure," & _
                     "FactFind_RoamingAsked,FactFind_EntertainmentAsked,FactFind_HbbOrAdditionalAsked," & _
                     "DealOffer_MgrDiscountUsed,DealOffer_VodafoneTogetherOffered,DealOffer_InsuranceOffered,DealOffer_AccessoryOffered,DealOffer_TradeInOffered," & _
                     "Objections_BenefitsExplained," & _
                     "FCR_SummarisePurchase,FCR_WhatElseCanIHelp," & _
                     "Session_EndReason", ",")

    ' Define colors for heading groups (pastel/muted for readability)
    Dim colorDefault As Long: colorDefault = RGB(189, 215, 238)  ' Light Blue (Default)
    Dim colorGreet As Long: colorGreet = RGB(204, 255, 204)      ' Pale Green
    Dim colorLoyalty As Long: colorLoyalty = RGB(255, 229, 153)    ' Pale Yellow/Amber
    Dim colorFactFind As Long: colorFactFind = RGB(197, 224, 180) ' Sage Green
    Dim colorDealOffer As Long: colorDealOffer = RGB(221, 199, 240) ' Lavender
    Dim colorObjections As Long: colorObjections = RGB(175, 220, 235) ' Light Teal/Blue (was Pale Pink/Salmon)
    Dim colorFCR As Long: colorFCR = RGB(169, 209, 142)        ' Muted Green
    Dim colorSession As Long: colorSession = RGB(217, 217, 217)    ' Light Gray
    Dim colorGeneric As Long: colorGeneric = RGB(222, 235, 247)   ' Very Light Blue for generic like Name, ID, Date

    For i = LBound(headings) To UBound(headings)
        Set headerCell = sheet.Cells(1, i + 1)
        currentHeading = Trim(headings(i))
        
        ' Determine group color
        If Left(currentHeading, 6) = "Greet_" Then
            groupColor = colorGreet
        ElseIf Left(currentHeading, 8) = "Loyalty_" Then
            groupColor = colorLoyalty
        ElseIf Left(currentHeading, 9) = "FactFind_" Then
            groupColor = colorFactFind
        ElseIf Left(currentHeading, 10) = "DealOffer_" Then
            groupColor = colorDealOffer
        ElseIf Left(currentHeading, 11) = "Objections_" Then
            groupColor = colorObjections
        ElseIf Left(currentHeading, 4) = "FCR_" Then
            groupColor = colorFCR
        ElseIf Left(currentHeading, 8) = "Session_" Then
            groupColor = colorSession
        ElseIf currentHeading = "Sheet Name" Or currentHeading = "Advisor Name" Or currentHeading = "Engagement ID" Or currentHeading = "Date" Or currentHeading = "Sale_OrderNumber" Or currentHeading = "HighRiskAlerted" Then
            groupColor = colorGeneric
        Else
            groupColor = colorDefault ' Fallback
        End If

        With headerCell
            .Value = currentHeading
            .Font.Bold = True
            .Font.Color = RGB(0, 0, 0) ' Black font for good contrast
            .HorizontalAlignment = xlCenter
            .VerticalAlignment = xlCenter
            .WrapText = True
            .Interior.Color = groupColor ' Apply the group-specific color
            ' Apply all-around thin borders first
            With .Borders
                .LineStyle = xlContinuous
                .Weight = xlThin
            End With
            ' Then apply a thicker top border specifically
            With .Borders(xlEdgeTop)
                .LineStyle = xlContinuous
                .Weight = xlThick 
            End With
        End With
    Next i
    sheet.Rows(1).AutoFit
End Sub

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
FoundName = "" 
End Function

Private Function ParseTimestamp(ByVal ts As String) As Date
    On Error Resume Next
    Dim parts As Variant
    Dim datePart As String, timePart As String
    
    If InStr(ts, " ") > 0 Then 
        parts = Split(ts, " ")
        If UBound(parts) = 1 Then 
            datePart = parts(0)
            timePart = parts(1)
        ElseIf UBound(parts) > 1 Then 
             timePart = parts(UBound(parts))
             datePart = parts(UBound(parts)-1)
        Else 
            timePart = ts
            datePart = ""
        End If
    Else 
        timePart = ts
        datePart = ""
    End If

    If datePart = "" Then
        ParseTimestamp = CDate(timePart)
    Else
        If InStr(datePart, "/") > 0 Then
            ParseTimestamp = CDate(datePart & " " & timePart)
        Else 
            ParseTimestamp = CDate(timePart)
        End If
    End If
    If Err.Number <> 0 Then
        ParseTimestamp = CDate("00:00:00") 
        Err.Clear
    End If
    On Error GoTo 0
End Function

Function ExtractChatDateV2(transcriptLines As Collection) As String
    On Error Resume Next
    Dim lineData As Scripting.Dictionary
    Dim timeStr As String
    Dim datePart As String
    Dim i As Long
    
    ExtractChatDateV2 = "N/A" ' Default

    For i = 1 To Application.WorksheetFunction.Min(transcriptLines.count, 10) ' Check first 10 lines
        Set lineData = transcriptLines(i)
        timeStr = Trim(CStr(lineData("Time")))
        
        If InStr(timeStr, " ") > 0 And InStr(timeStr, "/") > 0 Then
            datePart = Split(timeStr, " ")(0) ' Get the date part like "MM/DD" or "DD/MM"
            
            ' Attempt to parse and format, assuming MM/DD or DD/MM
            Dim arrDateParts As Variant
            arrDateParts = Split(datePart, "/")
            If UBound(arrDateParts) = 1 Then ' Should be two parts (Month/Day or Day/Month)
                Dim part1 As Integer, part2 As Integer
                If IsNumeric(arrDateParts(0)) And IsNumeric(arrDateParts(1)) Then
                    part1 = CInt(arrDateParts(0))
                    part2 = CInt(arrDateParts(1))
                    
                    ' Heuristic: if one part > 12, it's likely the day
                    If part1 > 12 And part2 <= 12 Then ' DD/MM
                        ExtractChatDateV2 = Format(DateSerial(Year(Now), part2, part1), "DD-MMM")
                        Exit Function
                    ElseIf part2 > 12 And part1 <= 12 Then ' MM/DD
                         ExtractChatDateV2 = Format(DateSerial(Year(Now), part1, part2), "DD-MMM")
                         Exit Function
                    ElseIf part1 <= 12 And part2 <= 12 Then ' Ambiguous, assume MM/DD as per original logic
                         ExtractChatDateV2 = Format(DateSerial(Year(Now), part1, part2), "DD-MMM")
                         Exit Function
                    End If
                End If
            End If
        End If
    Next i
    On Error GoTo 0
End Function

Function ExtractEngagementID(ws As Worksheet, transcriptLines As Collection) As String
    On Error Resume Next
    Dim engagementIDVal As String
    Dim potentialID As String

    engagementIDVal = Trim(CStr(ws.Cells(8, 1).Value))
    
    If engagementIDVal <> "" Then
        If LCase(Left(engagementIDVal, Len("Engagement ID "))) = LCase("Engagement ID ") Then
            potentialID = Trim(Mid(engagementIDVal, Len("Engagement ID ") + 1))
        Else
            potentialID = engagementIDVal
        End If
        
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
            If hasNumber Then 
                ExtractEngagementID = potentialID
                Exit Function
            End If
        End If
    End If

    Dim firstLineText As String
    firstLineText = Trim(CStr(ws.Cells(1, 1).Value))
    If LCase(firstLineText) Like "engagement id *" Then
        ExtractEngagementID = Trim(Mid(firstLineText, Len("Engagement ID") + 1))
        If ExtractEngagementID <> "" Then Exit Function
    End If

    Dim i As Long
    For i = 1 To Application.WorksheetFunction.Min(5, transcriptLines.count) 
        Dim lineData As Scripting.Dictionary
        Set lineData = transcriptLines(i)
        
        firstLineText = Trim(CStr(lineData("Time")))
        If LCase(firstLineText) Like "engagement id *" Then
            ExtractEngagementID = Trim(Mid(firstLineText, Len("Engagement ID") + 1))
            If ExtractEngagementID <> "" Then Exit Function
        End If

        firstLineText = Trim(CStr(lineData("Text")))
         If LCase(firstLineText) Like "engagement id *" Then
            ExtractEngagementID = Trim(Mid(firstLineText, Len("Engagement ID") + 1))
            If ExtractEngagementID <> "" Then Exit Function
        End If
    Next i
    
    ExtractEngagementID = "Not Found"
    On Error GoTo 0
End Function

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
        lineText = lineData("Text") 

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
    FindAgentUsername = "UnknownAgent" 
    On Error GoTo 0
End Function

Function CheckSaleOrderNumber(transcriptLines As Collection, fullTranscriptText As String) As String
    On Error Resume Next
    Dim lineData As Scripting.Dictionary
    Dim lineText As String
    Dim i As Long
    Dim orderNumPos As Long
    Dim extractedOrderString As String

    For i = 1 To transcriptLines.count
        Set lineData = transcriptLines(i)
        lineText = CStr(lineData("Text")) 
        
        If InStr(1, lineText, "CDH-", vbTextCompare) > 0 Then
            CheckSaleOrderNumber = "CDH"
            Exit Function
        ElseIf InStr(1, lineText, "SBL-", vbTextCompare) > 0 Then
            CheckSaleOrderNumber = "SBL"
            Exit Function
        End If
        
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
    CheckOpeningMessageTime = "N/A" ' Default value

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

    For j = i To transcriptLines.count 
        Set lineData = transcriptLines(j)
        speaker = lineData("Speaker")
        lineText = lineData("Text")
        timeStr = lineData("Time")

        If (InStr(1, speaker, "Agent-Freehand", vbTextCompare) > 0 And InStr(1, lineText, "[" & agentUsername & "]:", vbTextCompare) > 0) Or _
           (speaker = "Agent" And InStr(1, lineText, "[" & agentUsername & "]:", vbTextCompare) > 0 And Not (lineText Like "*enters chat*" Or lineText Like "*exits chat*")) Then
            If Trim(Mid(lineText, InStr(lineText, "]:") + 2)) <> "" Then 
                firstAgentMessageTime = ParseTimestamp(timeStr)
                Dim diffSeconds As Long
                diffSeconds = DateDiff("s", agentEntryTime, firstAgentMessageTime)
                If diffSeconds < 0 Then diffSeconds = 0
                CheckOpeningMessageTime = CStr(diffSeconds) & " seconds" ' Return as string representation of seconds
                Exit Function
            End If
        End If
    Next j
    
    CheckOpeningMessageTime = "N/A (No Greeting Found)"
    On Error GoTo 0
End Function

Function CalculateAgentChatDuration(transcriptLines As Collection, agentUsername As String) As String ' Renamed from CheckDurationOfChat
    On Error Resume Next
    Dim firstAgentMsgTime As Date
    Dim lastMsgTime As Date
    Dim foundFirstAgentMsg As Boolean
    Dim lineData As Scripting.Dictionary
    Dim i As Long
    Dim speaker As String, lineText As String, timeStr As String

    CalculateAgentChatDuration = "N/A"
    foundFirstAgentMsg = False

    If transcriptLines.count < 1 Then Exit Function

    ' Find the first message from the specified agent
    For i = 1 To transcriptLines.count
        Set lineData = transcriptLines(i)
        speaker = CStr(lineData("Speaker"))
        lineText = CStr(lineData("Text"))
        timeStr = CStr(lineData("Time"))

        If (InStr(1, speaker, "Agent", vbTextCompare) > 0 And InStr(1, lineText, "[" & agentUsername & "]:", vbTextCompare) > 0) Or _
           (speaker = agentUsername And Not (lineText Like "*enters chat*" Or lineText Like "*exits chat*")) Then
             If Trim(Mid(lineText, InStr(lineText, "]:") + 2)) <> "" Or speaker = agentUsername Then ' Ensure it's an actual message
                firstAgentMsgTime = ParseTimestamp(timeStr)
                foundFirstAgentMsg = True
                Exit For
            End If
        End If
    Next i

    If Not foundFirstAgentMsg Then
        CalculateAgentChatDuration = "N/A (Agent did not speak)"
        Exit Function
    End If

    ' Last message time is simply the time of the last entry in transcriptLines
    Set lineData = transcriptLines(transcriptLines.count)
    lastMsgTime = ParseTimestamp(CStr(lineData("Time")))

    If lastMsgTime < firstAgentMsgTime Then ' Chat spanned midnight
        lastMsgTime = DateAdd("d", 1, lastMsgTime)
    End If
    
    Dim durationSeconds As Long
    durationSeconds = DateDiff("s", firstAgentMsgTime, lastMsgTime)
    
    If durationSeconds < 0 Then
         CalculateAgentChatDuration = "N/A (Time Error)"
    Else
        Dim totalMinutes As Long
        Dim hours As Long
        Dim minutes As Long
        
        totalMinutes = durationSeconds / 60
        hours = Fix(totalMinutes / 60)
        minutes = Fix(totalMinutes Mod 60)
        
        If hours > 0 Then
            CalculateAgentChatDuration = hours & " h " & minutes & " min"
        Else
            CalculateAgentChatDuration = minutes & " min"
        End If
    End If
    On Error GoTo 0
End Function

Function CalculateAvgAgentResponseTime(transcriptLines As Collection, agentUsername As String) As String
    On Error Resume Next ' Keep error handling

    Dim totalResponseSeconds As Double
    Dim responseCount As Long
    Dim customerMsgTime As Date
    Dim agentMsgTime As Date
    Dim lineData As Scripting.Dictionary
    Dim i As Long
    Dim currentSpeaker As String
    Dim currentTimeStr As String
    Dim currentLineText As String ' For the text of the current line
    Dim isCustomerTurn As Boolean

    totalResponseSeconds = 0
    responseCount = 0
    isCustomerTurn = False
    CalculateAvgAgentResponseTime = "N/A" ' Default return

    If transcriptLines.count < 2 Then Exit Function ' Need at least two lines for a response

    For i = 1 To transcriptLines.count ' Iterate through all lines
        Set lineData = transcriptLines(i)
        currentSpeaker = CStr(lineData("Speaker"))
        currentTimeStr = CStr(lineData("Time"))
        currentLineText = CStr(lineData("Text"))

        If LCase(currentSpeaker) = "customer" Then
            ' Check if the customer message is not empty
            If Trim(currentLineText) <> "" Then
                customerMsgTime = ParseTimestamp(currentTimeStr)
                isCustomerTurn = True
            End If
        ElseIf isCustomerTurn And _
               ((InStr(1, currentSpeaker, "Agent", vbTextCompare) > 0 And InStr(1, currentLineText, "[" & agentUsername & "]:", vbTextCompare) > 0) Or _
                (currentSpeaker = agentUsername)) Then
            
            Dim actualMessageContent As String
            Dim prefixEndPos As Long
            prefixEndPos = InStr(currentLineText, "]:")
            
            If prefixEndPos > 0 Then
                actualMessageContent = Trim(Mid(currentLineText, prefixEndPos + 2))
            Else
                actualMessageContent = Trim(currentLineText) 
            End If

            If actualMessageContent <> "" And Not (currentLineText Like "*enters chat*" Or currentLineText Like "*exits chat*") Then
                agentMsgTime = ParseTimestamp(currentTimeStr)
                
                Dim diffSeconds As Long
                diffSeconds = DateDiff("s", customerMsgTime, agentMsgTime)
                
                If diffSeconds >= 0 Then 
                    totalResponseSeconds = totalResponseSeconds + diffSeconds
                    responseCount = responseCount + 1
                End If
                
                isCustomerTurn = False 
            End If
        End If
    Next i

    If responseCount > 0 Then
        CalculateAvgAgentResponseTime = Round(totalResponseSeconds / responseCount, 0) & " seconds"
    Else
        CalculateAvgAgentResponseTime = "N/A (No valid agent responses)"
    End If
    
    If Err.Number <> 0 Then
        CalculateAvgAgentResponseTime = "N/A (Error in calculation)"
        Err.Clear
    End If
    On Error GoTo 0 
End Function

Function CheckSessionEndReason(transcriptLines As Collection) As String
    On Error Resume Next
    Dim lineData As Scripting.Dictionary
    Dim lineText As String
    Dim i As Long
    CheckSessionEndReason = "N/A" ' Default

    ' Check last few lines (e.g., last 5)
    For i = Application.WorksheetFunction.Max(1, transcriptLines.count - 4) To transcriptLines.count
        Set lineData = transcriptLines(i)
        lineText = CStr(lineData("Text"))

        If InStr(1, lineText, "Chat Session Ended due to agent leaving", vbTextCompare) > 0 Then
            CheckSessionEndReason = "Agent Left"
            Exit Function
        ElseIf InStr(1, lineText, "Chat Session Ended due to customer leaving", vbTextCompare) > 0 Then
            CheckSessionEndReason = "Customer Left"
            Exit Function
        ElseIf InStr(1, lineText, "Chat Session Ended due to inactivity", vbTextCompare) > 0 Then
            CheckSessionEndReason = "Inactivity"
            Exit Function
        ElseIf InStr(1, lineText, "Chat Session Ended", vbTextCompare) > 0 Then
            CheckSessionEndReason = "Ended (Reason Unknown)"
            ' Don't exit function, might find a more specific reason later in these last lines
        End If
    Next i
    On Error GoTo 0
End Function

Private Function GenericKeywordCheck(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String, keywords As Variant, Optional speakerMustBeAgent As Boolean = True) As String
    On Error Resume Next
    Dim keyword As Variant
    Dim lineData As Scripting.Dictionary
    Dim lineText As String, speaker As String
    Dim i As Long

    GenericKeywordCheck = "No" ' Default to No

    If IsMissing(keywords) Then
        GenericKeywordCheck = "N/A (No Keywords)"
        Exit Function
    End If
    
    If Not IsArray(keywords) Then
        keywords = Array(keywords) 
    End If

    For Each keyword In keywords
        If Trim(CStr(keyword)) = "" Then GoTo NextKeyword 
        
        If speakerMustBeAgent Then
            For i = 1 To transcriptLines.count
                Set lineData = transcriptLines(i)
                lineText = CStr(lineData("Text"))
                speaker = CStr(lineData("Speaker"))
                
                If (InStr(1, speaker, "Agent", vbTextCompare) > 0 And InStr(1, lineText, "[" & agentUsername & "]:", vbTextCompare) > 0) Or _
                   (speaker = agentUsername And Not (lineText Like "*enters chat*" Or lineText Like "*exits chat*")) Then 
                    If InStr(1, lineText, CStr(keyword), vbTextCompare) > 0 Then
                        GenericKeywordCheck = "Yes"
                        Exit Function
                    End If
                End If
            Next i
        Else 
            If InStr(1, fullTranscriptText, CStr(keyword), vbTextCompare) > 0 Then
                GenericKeywordCheck = "Yes"
                Exit Function
            End If
        End If
NextKeyword:
    Next keyword
    On Error GoTo 0
End Function

Function CheckAskedHowAreYou(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("how are you", "how are you doing", "hope you're having a great day", "hope you're well")
    CheckAskedHowAreYou = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function

Function CheckAdvisedRetentionsTeam(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("Retention Team", "Retentions Team", "part of Retentions", "I'm in Retentions", "Vodafone’s Retention team") 
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
    keywords = Array("broadband", "home broadband", "wifi", "another line", "additional SIM", "another phone")
    CheckHbbOrAdditionalAsked = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function

Function CheckMgrDiscountUsed(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("manager's discount", "managers discount", "manager discount", "discretionary discount")
    CheckMgrDiscountUsed = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function

Function CheckVodafoneTogetherOffered(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("Vodafone Together", "Vodafone bundle", "bundle your services")
    CheckVodafoneTogetherOffered = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function

Function CheckInsuranceOffered(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("insurance", "device care", "cover for your phone")
    CheckInsuranceOffered = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function

Function CheckAccessoryOffered(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("accessory", "case", "charger", "headphones", "screen protector")
    CheckAccessoryOffered = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function

Function CheckTradeInOffered(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("trade-in", "trade in your old phone", "recycle your device")
    CheckTradeInOffered = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function

Function CheckBenefitsExplained(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("benefits", "advantages", "what you get", "features include")
    CheckBenefitsExplained = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function

Function CheckSummarisePurchase(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("to summarise", "just to confirm", "recap your order", "summary of your purchase")
    CheckSummarisePurchase = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function

Function CheckWhatElseCanIHelp(transcriptLines As Collection, fullTranscriptText As String, agentUsername As String) As String
    Dim keywords As Variant
    keywords = Array("anything else I can help with", "what else can I do for you", "is there anything else")
    CheckWhatElseCanIHelp = GenericKeywordCheck(transcriptLines, fullTranscriptText, agentUsername, keywords, True)
End Function
