# AI Interview Chat - Strategic Improvements

## Testing Analysis Summary

Based on user testing with a "nighttime noise" scenario, identified **4 critical improvement areas**:

### Issues Identified:

1. ❌ **Multiple questions in one message** - AI asked 2-3 questions simultaneously, overwhelming users
2. ❌ **Missing diagnostic intelligence** - Didn't ask the most diagnostic question first (e.g., "Does it happen when heating turns on?")
3. ❌ **Generic extraction** - Only captured basic fields, missing rich diagnostic metadata
4. ❌ **Non-specific requirements** - Key requirements were vague ("identify source" vs "diagnose rhythmic clicking in walls/attic")

## Improvements Implemented

### 1. Enforced ONE Question at a Time ✅

**System Prompt Changes:**
```
- **Ask ONE question at a time**: CRITICAL - Never ask multiple questions in one message.
  Focus on the single most diagnostic question.

**CRITICAL RULE**: Each message must end with exactly ONE question mark.
If you find yourself writing "and" or "also" before a second question, STOP -
save that question for the next turn.
```

**Examples Added:**
- ✅ GOOD: "That sounds like thermal expansion. Does this clicking happen right after your heating turns on or off?"
- ❌ BAD: "That sounds like thermal expansion. Does it happen when the heating turns on? And what time of night is it?"

### 2. Added Diagnostic Intelligence for Common Issues ✅

**New Section: Issue-Specific Follow-Up Logic**

**Noise Issues (clicking/tapping/humming):**
1. FIRST: "What does the sound remind you of?" (provide examples)
2. THEN: "Does this happen right after your heating or AC turns on or off?" (thermal expansion diagnosis)
3. THEN: "Where in the house does it seem loudest?"
4. THEN: "How long has this been happening?"

**Water Issues (leaks/drips/pressure):**
1. FIRST: "Is water actively leaking right now?" (urgency check)
2. THEN: "Where exactly is the water coming from?"
3. THEN: "How much water - dripping, steady stream, or gushing?"

**HVAC Issues:**
1. FIRST: "Is it not working at all, or just not reaching the temperature you set?"
2. THEN: "When did you first notice this?"
3. THEN: "Have you checked if the thermostat is set correctly?"

**Electrical Issues:**
1. FIRST: "Have you checked your circuit breaker panel?" (safety first)
2. THEN: "Is this affecting one outlet/light or multiple areas?"
3. THEN: "Did anything happen before this - storm, power surge, renovation?"

**Key Principle:** Always prioritize the question that eliminates the most uncertainty or identifies safety risks.

### 3. Enriched Extraction Schema ✅

**Added Diagnostic Metadata Fields:**

```typescript
export interface ExtractedProblemInfo {
  // ... existing fields ...

  // NEW: Diagnostic metadata
  issue_type?: string; // "noise_complaint", "leak", "no_power"
  symptoms?: string[]; // ["clicking_sound", "nighttime_only", "rhythmic_pattern"]
  suspected_causes?: string[]; // ["thermal_expansion", "plumbing_pipes", "HVAC_ducts"]
  timeline?: string; // "last week", "two months ago"
  frequency?: string; // "every night", "intermittent", "constant"
  conditions?: string; // "when_heating_on", "during_rain"
}
```

**Extraction System Prompt Updates:**
- Added "diagnostic" as a service_category option
- Instructed to extract diagnostic metadata even if partial
- Emphasized SPECIFIC key_requirements (not "identify source" but "diagnose rhythmic clicking in walls/attic")
- Added rules for capturing sound types, timing patterns, and conditions

### 4. Enhanced UI to Display Diagnostic Data ✅

**New UI Sections in Extracted Information Panel:**

1. **Symptoms** - Displays observable symptoms as badges
   ```tsx
   {extractedInfo.symptoms && extractedInfo.symptoms.length > 0 && (
     <div>
       <p className="text-sm font-semibold text-muted-foreground mb-2">Symptoms</p>
       <div className="flex flex-wrap gap-1">
         {extractedInfo.symptoms.map((symptom: string, idx: number) => (
           <Badge key={idx} variant="outline" className="text-xs">
             {symptom}
           </Badge>
         ))}
       </div>
     </div>
   )}
   ```

2. **Potential Causes** - Shows suspected causes identified by AI
   ```tsx
   {extractedInfo.suspected_causes && extractedInfo.suspected_causes.length > 0 && (
     <div>
       <p className="text-sm font-semibold text-muted-foreground mb-2">
         Potential Causes
       </p>
       <div className="flex flex-wrap gap-1">
         {extractedInfo.suspected_causes.map((cause: string, idx: number) => (
           <Badge key={idx} variant="secondary" className="text-xs">
             {cause}
           </Badge>
         ))}
       </div>
     </div>
   )}
   ```

3. **Pattern** - Shows frequency and conditions
   ```tsx
   {(extractedInfo.frequency || extractedInfo.conditions) && (
     <div>
       <p className="text-sm font-semibold text-muted-foreground mb-1">Pattern</p>
       <p className="text-sm">
         {extractedInfo.frequency && (
           <span className="block">Frequency: {extractedInfo.frequency}</span>
         )}
         {extractedInfo.conditions && (
           <span className="block">Occurs: {extractedInfo.conditions}</span>
         )}
       </p>
     </div>
   )}
   ```

## Expected Behavior Improvements

### Before Changes:

**User:** "Something's wrong with my house"
**AI:** "Got it - annoying is still worth fixing! Tell me more about this sound - what does it sound like? And does it seem to be coming from a specific area of the house?"

**Issues:**
- Asked 2 questions at once
- No extraction visible yet

**Extracted Info:**
```json
{
  "service_category": "other",
  "urgency": "standard",
  "description": "Basic summary",
  "key_requirements": ["Generic requirement"]
}
```

### After Changes:

**User:** "Something's wrong with my house"
**AI:** "That sounds frustrating, let me help you get this sorted out. What does the sound remind you of - is it more like clicking, humming, banging, or scratching?"

**User:** "It's like clicking or tapping, kind of rhythmic"
**AI:** "That sounds like it could be thermal expansion in your pipes or HVAC ducts. Does this clicking happen right after your heating or AC turns on or off?"

**Expected Extracted Info:**
```json
{
  "service_category": "diagnostic",
  "urgency": "standard",
  "issue_type": "noise_complaint",
  "symptoms": ["clicking_sound", "rhythmic_pattern", "nighttime_only"],
  "suspected_causes": ["thermal_expansion", "plumbing_pipes", "HVAC_ducts"],
  "frequency": "nightly",
  "key_requirements": [
    "Diagnose rhythmic clicking/tapping in walls or attic occurring at night"
  ]
}
```

## Testing Checklist

### Test the "One Question at a Time" Rule:
- [ ] AI should only ask ONE question per message
- [ ] No "and" or "also" connecting multiple questions
- [ ] Each message ends with exactly one question mark

### Test Diagnostic Intelligence:
- [ ] For noise issues: AI asks about HVAC/heating correlation
- [ ] For water issues: AI prioritizes urgency check first
- [ ] For electrical issues: AI asks about circuit breaker (safety first)

### Test Enriched Extraction:
- [ ] Symptoms array populates with specific observations
- [ ] Suspected causes appear in UI
- [ ] Frequency/conditions captured when mentioned
- [ ] Key requirements are SPECIFIC, not generic

### Test UI Display:
- [ ] "Symptoms" section shows badges for each symptom
- [ ] "Potential Causes" section displays with secondary badge style
- [ ] "Pattern" section shows frequency and conditions
- [ ] All sections update in real-time as conversation progresses

## Files Modified

1. **`src/lib/agents/problem-interview-agent.ts`**
   - Enhanced system prompt with ONE question rule
   - Added diagnostic intelligence section
   - Added explicit examples of good vs bad responses
   - Enriched ExtractedProblemInfo interface with diagnostic fields
   - Updated extraction system prompt to capture diagnostic metadata

2. **`src/components/consumer/ai-interview-chat.tsx`**
   - Added Symptoms display section
   - Added Potential Causes display section
   - Added Pattern display section (frequency + conditions)
   - All new sections conditionally render based on extracted data

## Cost Impact

**No significant cost increase:**
- One question at a time may increase turn count by 1-2 messages
- Enriched extraction uses same API call (just better prompt)
- Estimated increase: +$0.01-0.02 per interview (negligible)

**Value gained:**
- Higher quality leads for service providers
- Better diagnostic information reduces wasted trips
- More accurate quoting from richer problem descriptions
- Improved user experience (clearer conversation flow)

## Next Steps (Future Enhancements)

1. **Add voice input** - Allow users to describe problems verbally
2. **Photo upload** - Let users share photos of the issue
3. **Calendar integration** - Capture specific availability windows
4. **Follow-up suggestions** - AI proactively suggests follow-up questions based on extracted data
5. **Smart completion detection** - End interview automatically when enough high-quality data gathered
