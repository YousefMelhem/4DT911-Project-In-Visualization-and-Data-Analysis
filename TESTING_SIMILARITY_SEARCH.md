# 🚀 Testing the Similarity Search Models

## 🎯 What We Built

You now have a **full-stack medical case similarity search system** that integrates:
- ✅ **TF-IDF** keyword-based search
- ✅ **BERT** semantic text search  
- ✅ **FastAPI** backend with ML models
- ✅ **Nuxt.js** interactive frontend

---

## 📋 Quick Start (3 Steps)

### **Step 1: Install Backend Dependencies**

```bash
cd /home/yousef/code/school/4DT911-project/backend
pip install -r requirements.txt
```

⏱️ **Time:** 5-10 minutes (downloads BERT model ~100MB)

---

### **Step 2: Start the Backend Server**

```bash
cd /home/yousef/code/school/4DT911-project/backend
python main.py
```

You should see:
```
Loading ML-ready cases...
✅ Loaded 7,404 cases
Loading TF-IDF model...
Loading BERT embeddings...
Loading BERT model...
✅ All models loaded successfully!
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

✅ **Backend ready at:** `http://localhost:8000`

---

### **Step 3: Start the Frontend**

Open a **new terminal**:

```bash
cd /home/yousef/code/school/4DT911-project
pnpm dev
```

✅ **Frontend ready at:** `http://localhost:3000`

---

## 🔍 How to Use the Similarity Search

### **Option 1: Navigate in the Website**
1. Open `http://localhost:3000`
2. Click **"🔍 Similarity Search"** in the navbar
3. You'll see the similarity search interface!

### **Option 2: Direct URL**
- Go to: `http://localhost:3000/similarity`

---

## 🎮 Features You Can Test

### **1. Text-Based Search**
Type any medical query:
- "pneumonia"
- "fracture humerus"  
- "brain tumor glioblastoma"
- "myocardial infarction"

Press **Enter** or click **🔍 Search**

### **2. Case-Based Search**
- Click any sample case button
- Finds similar cases to that one
- Shows top 10 most similar

### **3. Compare TF-IDF vs BERT**
- Select **"⚖️ Compare Both"** method
- Click a case
- See side-by-side comparison!

### **4. Adjust Results**
- Change "Results to show" (5-20)
- Switch between TF-IDF and BERT methods

---

## 📊 API Endpoints You Can Test

### **Test in Browser:**

1. **Get Model Stats**  
   `http://localhost:8000/api/similarity/stats`
   
2. **Find Similar Cases by ID**  
   `http://localhost:8000/api/similarity/similar/case_-1000126129694890866?method=bert&top_k=10`

3. **Compare Methods**  
   `http://localhost:8000/api/similarity/compare/case_-1000126129694890866?top_k=10`

### **Test with CURL:**

```bash
# Search by text
curl -X POST http://localhost:8000/api/similarity/search \
  -H "Content-Type: application/json" \
  -d '{
    "text": "pneumonia lung infection",
    "method": "bert",
    "top_k": 5
  }'
```

---

## 🎨 What You'll See on the Frontend

### **Search Interface:**
- 3 method buttons: TF-IDF | BERT | Compare Both
- Text input for custom queries
- Sample case quick selection
- Results count adjuster (5-20)

### **Results Display:**
- **Rank** (#1, #2, #3...)
- **Similarity Score** (0-100% match)
  - 🟢 Green: High similarity (>70%)
  - 🟡 Orange: Medium (40-70%)
  - ⚫ Gray: Low (<40%)
- **Diagnosis**, History, Findings
- **Image count** for each case
- **View Details →** link to case page

### **Comparison Mode:**
- Side-by-side TF-IDF vs BERT results
- Overlap statistics (how many cases both found)
- Search time performance

### **Model Statistics:**
- TF-IDF: 2,000 features, 98.2% sparse
- BERT: 384 dimensions, semantic embeddings
- Mean/median similarity scores

---

## 💡 Expected Behavior

### **TF-IDF Results:**
- Finds cases with **exact same keywords**
- Example: "fracture" → finds cases with word "fracture"
- Lower similarity scores (~3-10%)
- Very precise, less flexible

### **BERT Results:**
- Finds **semantically similar** cases
- Example: "MI" → finds "myocardial infarction"
- Higher similarity scores (~20-40%)
- Understands synonyms and medical abbreviations

### **Comparison:**
- **Overlap:** Usually 30-50% of results are same
- **BERT** finds more semantically related cases
- **TF-IDF** finds exact keyword matches

---

## 🐛 Troubleshooting

### **Problem: "Failed to load stats"**
**Solution:** Backend is not running
```bash
# Start backend
cd backend
python main.py
```

### **Problem: CORS errors in browser console**
**Solution:** Make sure backend is running on port 8000 and frontend on port 3000

### **Problem: "ModuleNotFoundError: sentence_transformers"**
**Solution:** Install backend requirements
```bash
cd backend
pip install -r requirements.txt
```

### **Problem: "File not found: tfidf_features.npz"**
**Solution:** Make sure Phase 2 notebooks created the features
```bash
ls data/features/
# Should see: tfidf_features.npz, text_embeddings_bert.npy, etc.
```

### **Problem: Very slow first search**
**Solution:** First BERT query downloads model (~100MB). Wait 1-2 minutes, then it's fast!

---

## 📈 Performance Expectations

### **Search Speed:**
- **TF-IDF:** ~5-20ms per query
- **BERT:** ~10-30ms per query  
- **Comparison:** ~20-50ms (both methods)

### **Accuracy (Expected):**
- **TF-IDF:** ~20-30% relevant in top 10
- **BERT:** ~40-50% relevant in top 10
- **Improvement:** 2x better with BERT!

---

## 🧪 Testing Checklist

- [ ] Backend starts without errors
- [ ] Frontend opens at localhost:3000
- [ ] Can navigate to Similarity Search page
- [ ] Model stats load and display
- [ ] Text search returns results
- [ ] Case-based search works
- [ ] Can switch between TF-IDF and BERT
- [ ] Compare mode shows both results
- [ ] Similarity scores make sense
- [ ] Can click "View Details" to see cases

---

## 🎯 What's Next?

### **Phase 3: Add Image Features**
Once this works, we can add:
- CNN image embeddings (ResNet50)
- Visual similarity search
- **Multimodal fusion** (text + images combined!)

### **Phase 4: Enhanced UI**
- Search history
- Save favorite queries
- Export results
- Advanced filters

### **Phase 5: Optimization**
- Faiss for faster search
- Caching frequent queries
- Batch processing

---

## 🎉 Success Criteria

You'll know it's working when:
1. ✅ Type "pneumonia" → Gets relevant cases
2. ✅ BERT finds more results than TF-IDF (higher scores)
3. ✅ Compare mode shows differences
4. ✅ Search is fast (<100ms)
5. ✅ Can click through to see case details

---

## 📞 Need Help?

Check:
1. Backend terminal for errors
2. Browser console (F12) for frontend errors
3. `http://localhost:8000/docs` for API documentation (FastAPI auto-generated!)

---

**Ready to test? Start both servers and navigate to the Similarity Search page!** 🚀
