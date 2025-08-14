"""
Translation service using Google Translate API for English translations.
"""

import asyncio
import aiohttp
from typing import Optional, List, Dict, Any
import urllib.parse

from ..core.config import get_settings
from ..core.logging import get_logger
from ..core.exceptions import ExternalAPIError, ProcessingError

logger = get_logger(__name__)


class TranslationService:
    """Service for translating text using Google Translate API."""
    
    def __init__(self):
        self.settings = get_settings()
        self.api_url = "https://translation.googleapis.com/language/translate/v2"
        self._translation_cache = {}
    
    async def translate(
        self,
        text: str,
        target_language: str = "en",
        source_language: str = "zh"
    ) -> Optional[str]:
        """
        Translate text using Google Translate API.
        
        Args:
            text: Text to translate
            target_language: Target language code (default: en)
            source_language: Source language code (default: zh)
            
        Returns:
            Translated text or None if translation fails
        """
        try:
            if not text or not text.strip():
                return None
            
            # Check cache first
            cache_key = f"{source_language}:{target_language}:{text}"
            if cache_key in self._translation_cache:
                return self._translation_cache[cache_key]
            
            if not self.settings.google_translate_api_key:
                logger.warning("Google Translate API key not configured")
                return None
            
            # Prepare API request
            params = {
                "q": text,
                "target": target_language,
                "source": source_language,
                "key": self.settings.google_translate_api_key,
                "format": "text"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    data=params,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Google Translate API error {response.status}: {error_text}")
                        return None
                    
                    result = await response.json()
            
            # Extract translation
            translations = result.get("data", {}).get("translations", [])
            if not translations:
                logger.warning(f"No translation returned for: {text}")
                return None
            
            translated_text = translations[0].get("translatedText", "")
            
            # Cache the result
            self._translation_cache[cache_key] = translated_text
            
            logger.debug(f"Translated '{text}' -> '{translated_text}'")
            return translated_text
            
        except Exception as e:
            logger.error(f"Error in translation: {str(e)}")
            return None
    
    async def batch_translate(
        self,
        texts: List[str],
        target_language: str = "en",
        source_language: str = "zh"
    ) -> List[Optional[str]]:
        """
        Translate multiple texts in batch for better performance.
        
        Args:
            texts: List of texts to translate
            target_language: Target language code
            source_language: Source language code
            
        Returns:
            List of translated texts (same order as input)
        """
        try:
            if not texts:
                return []
            
            if not self.settings.google_translate_api_key:
                logger.warning("Google Translate API key not configured")
                return [None] * len(texts)
            
            # Filter out empty texts and prepare for batch request
            text_mapping = {}
            texts_to_translate = []
            
            for i, text in enumerate(texts):
                if text and text.strip():
                    cache_key = f"{source_language}:{target_language}:{text}"
                    if cache_key in self._translation_cache:
                        text_mapping[i] = self._translation_cache[cache_key]
                    else:
                        texts_to_translate.append((i, text))
            
            # Translate remaining texts
            if texts_to_translate:
                # Prepare batch request
                params = {
                    "target": target_language,
                    "source": source_language,
                    "key": self.settings.google_translate_api_key,
                    "format": "text"
                }
                
                # Add all texts as 'q' parameters
                for _, text in texts_to_translate:
                    params[f"q"] = text
                
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        self.api_url,
                        data=params,
                        timeout=aiohttp.ClientTimeout(total=60)
                    ) as response:
                        
                        if response.status == 200:
                            result = await response.json()
                            translations = result.get("data", {}).get("translations", [])
                            
                            # Map translations back to original indices
                            for j, (i, original_text) in enumerate(texts_to_translate):
                                if j < len(translations):
                                    translated = translations[j].get("translatedText", "")
                                    text_mapping[i] = translated
                                    
                                    # Cache the result
                                    cache_key = f"{source_language}:{target_language}:{original_text}"
                                    self._translation_cache[cache_key] = translated
                        else:
                            logger.error(f"Batch translation failed: {response.status}")
            
            # Build final result list
            result = []
            for i, text in enumerate(texts):
                result.append(text_mapping.get(i))
            
            return result
            
        except Exception as e:
            logger.error(f"Error in batch translation: {str(e)}")
            return [None] * len(texts)
    
    async def detect_language(self, text: str) -> Optional[str]:
        """
        Detect the language of the given text.
        
        Args:
            text: Text to analyze
            
        Returns:
            Language code or None if detection fails
        """
        try:
            if not text or not text.strip():
                return None
            
            if not self.settings.google_translate_api_key:
                return None
            
            detect_url = "https://translation.googleapis.com/language/translate/v2/detect"
            params = {
                "q": text,
                "key": self.settings.google_translate_api_key
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    detect_url,
                    data=params,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    
                    if response.status != 200:
                        return None
                    
                    result = await response.json()
            
            detections = result.get("data", {}).get("detections", [])
            if detections and detections[0]:
                detected_lang = detections[0][0].get("language")
                confidence = detections[0][0].get("confidence", 0)
                
                logger.debug(f"Detected language: {detected_lang} (confidence: {confidence})")
                return detected_lang
            
            return None
            
        except Exception as e:
            logger.error(f"Error in language detection: {str(e)}")
            return None
    
    async def get_supported_languages(self) -> List[Dict[str, str]]:
        """
        Get list of supported languages.
        
        Returns:
            List of language dictionaries with code and name
        """
        try:
            if not self.settings.google_translate_api_key:
                return []
            
            languages_url = "https://translation.googleapis.com/language/translate/v2/languages"
            params = {
                "key": self.settings.google_translate_api_key,
                "target": "en"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    languages_url,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    
                    if response.status != 200:
                        return []
                    
                    result = await response.json()
            
            languages = result.get("data", {}).get("languages", [])
            return languages
            
        except Exception as e:
            logger.error(f"Error getting supported languages: {str(e)}")
            return []
    
    async def validate_api_key(self) -> bool:
        """
        Validate that the Google Translate API key is working.
        
        Returns:
            True if API key is valid, False otherwise
        """
        try:
            if not self.settings.google_translate_api_key:
                return False
            
            # Test with a simple translation
            result = await self.translate("hello", target_language="zh", source_language="en")
            return result is not None
            
        except Exception as e:
            logger.error(f"API key validation failed: {str(e)}")
            return False
    
    def clear_cache(self):
        """Clear the translation cache."""
        self._translation_cache.clear()
        logger.info("Translation cache cleared")


# Global service instance
translation_service = TranslationService()